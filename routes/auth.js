const express = require("express");
const router = express.Router();

const db = require("../database/users");

function getCookieOptions(req) {
    const forwardedProto = (req.headers["x-forwarded-proto"] || "").toString().toLowerCase();
    const isHttps = req.secure || forwardedProto.includes("https");

    return {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: "/",
        sameSite: "lax",
        secure: isHttps
    };
}

router.get("/telegram", (req, res) => {

    const { otp } = req.query;

    db.get(
        `
        SELECT *
        FROM login_codes
        WHERE code = ?
        AND used = 0
        `,
        [otp],
        (err, code) => {

            if (!code) {
                return res.json({
                    success: false,
                    message: "Invalid code."
                });
            }

            if (Date.now() > code.expires_at) {
                return res.json({
                    success: false,
                    message: "Code expired."
                });
            }

            db.run(
                `UPDATE login_codes SET used = 1 WHERE id = ?`,
                [code.id]
            );

            db.get(
                `
                SELECT *
                FROM users
                WHERE telegram_id = ?
                `,
                [code.telegram_id],
                (err, user) => {

                    if (!user) {
                        return res.json({
                            success: false
                        });
                    }

                    const photoUrl = user.photo_url || user.profile_photo || null;

                    res.cookie(
                        "telegram_id",
                        user.telegram_id,
                        getCookieOptions(req)
                    );

                    res.json({
                        success: true,
                        user: {
                            telegram_id: user.telegram_id,
                            username: user.username,
                            name: user.first_name,
                            phone: user.phone_number,
                            photo_url: photoUrl,
                            photo: photoUrl
                        }
                    });

                }
            );

        }
    );

});


// Return current logged-in user based on cookie
router.get('/me', (req, res) => {

    const telegramId = req.cookies && req.cookies.telegram_id;

    if (!telegramId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    db.get(
        `
        SELECT *
        FROM users
        WHERE telegram_id = ?
        `,
        [telegramId],
        (err, user) => {

            if (err) return res.status(500).json({ error: 'Database error' });

            if (!user) return res.status(404).json({ error: 'User not found' });

            const photoUrl = user.photo_url || user.profile_photo || null;

            res.json({
                user: {
                    telegram_id: user.telegram_id,
                    username: user.username,
                    first_name: user.first_name,
                    phone_number: user.phone_number,
                    photo_url: photoUrl,
                    roles: user.roles,
                    created_at: user.created_at
                }
            });

        }
    );

});

router.post("/telegram/verify", (req, res) => {


    const { code } = req.body;


    if (!code) {
        return res.status(400).json({
            error: "Code required"
        });
    }



    db.get(
        `
        SELECT *
        FROM login_codes
        WHERE code = ?
        AND used = 0
        `,
        [
            code
        ],

        (err, loginCode) => {


            if (err) {
                return res.status(500).json({
                    error: "Database error"
                });
            }


            if (!loginCode) {

                return res.status(401).json({
                    error: "Invalid code"
                });

            }



            // Check expiration

            if (Date.now() > loginCode.expires_at) {


                return res.status(401).json({
                    error: "Code expired"
                });


            }



            // Mark code used

            db.run(
                `
                UPDATE login_codes
                SET used = 1
                WHERE id = ?
                `,
                [
                    loginCode.id
                ]
            );



            // Get user

            db.get(
                `
                SELECT *
                FROM users
                WHERE telegram_id = ?
                `,
                [
                    loginCode.telegram_id
                ],

                (err, user) => {


                    if (!user) {

                        return res.status(404).json({
                            error: "User not found"
                        });

                    }


                    res.cookie(
                        "telegram_id",
                        user.telegram_id,
                        getCookieOptions(req)
                    );


                    res.json({

                        success: true,

                        user: {
                            telegram_id: user.telegram_id,
                            username: user.username,
                            name: user.first_name,
                            phone: user.phone_number,
                            photo_url: user.photo_url
                        }

                    });


                }
            );



        }
    );


});


module.exports = router;