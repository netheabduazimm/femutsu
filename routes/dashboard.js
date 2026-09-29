const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const db = require("../database/users");


// Dashboard page
router.get("/", adminAuth, (req, res) => {

    res.sendFile(
        "dashboard.html",
        {
            root: "./views"
        }
    );

});




// Get users API
router.get("/api/users", (req, res) => {


    db.all(
        `
        SELECT
            id,
            telegram_id,
            username,
            first_name,
            photo_url,
            roles,
            created_at
        FROM users
        ORDER BY id DESC
        `,
        [],
        (err, rows)=>{


            if(err){

                console.error(err);

                return res.status(500).json({
                    error:"Database error"
                });

            }


            res.json(rows);


        }
    );


});



module.exports = router;