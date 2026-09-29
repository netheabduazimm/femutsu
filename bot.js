require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api").default;
const crypto = require("crypto");
const db = require("./database/users");
const fs = require("fs");
const path = require("path");

const bot = new TelegramBot(
    process.env.BOT_TOKEN,
    {
        polling: true
    }
);


console.log("Femutsu bot started");

module.exports = bot;


// Generate 6 digit code
function generateCode() {

    return crypto
        .randomInt(100000, 999999)
        .toString();

}


// Get Telegram profile picture
// Download and save Telegram profile picture
async function saveTelegramPhoto(userId) {

    try {

        const photos = await bot.getUserProfilePhotos(
            userId,
            {
                limit: 1
            }
        );


        if (
            photos.total_count === 0
        ) {
            return null;
        }


        const biggestPhoto =
            photos.photos[0][
                photos.photos[0].length - 1
            ];


        const file =
            await bot.getFile(
                biggestPhoto.file_id
            );


        const telegramUrl =
            `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;


        const avatarDir =
            path.join(
                __dirname,
                "uploads",
                "avatars"
            );


        if (!fs.existsSync(avatarDir)) {

            fs.mkdirSync(
                avatarDir,
                {
                    recursive: true
                }
            );

        }


        const filename =
            `${userId}.png`;


        const filepath =
            path.join(
                avatarDir,
                filename
            );


        const response =
            await fetch(telegramUrl);


        const buffer =
            await response.arrayBuffer();


        fs.writeFileSync(
            filepath,
            Buffer.from(buffer)
        );


        console.log(
            `Avatar saved: ${filename}`
        );


        return `/uploads/avatars/${filename}`;


    } catch(error) {

        console.log(
            "Failed to save Telegram photo:",
            error.message
        );

        return null;

    }

}


// Save login code
function createLoginCode(telegramId) {

    return new Promise((resolve) => {

        const code = generateCode();

        const expiresAt =
            Date.now() + (3 * 60 * 1000);


        db.run(
            `
            INSERT INTO login_codes
            (
                telegram_id,
                code,
                expires_at
            )
            VALUES (?, ?, ?)
            `,
            [
                telegramId,
                code,
                expiresAt
            ],
            () => {

                resolve(code);

            }
        );

    });

}



// Start command
bot.onText(/\/start/, (msg) => {


    bot.sendMessage(
        msg.chat.id,

        "Femutsuga xush kelibsiz 🔒\n\nAkkaunt yaratish uchun raqamingizni jo'nating.",

        {
            reply_markup: {

                keyboard: [
                    [
                        {
                            text: "📱 Raqamni jo'natish",
                            request_contact: true
                        }
                    ]
                ],

                resize_keyboard: true,
                one_time_keyboard: true

            }
        }
    );


});




// Receive contact
bot.on("contact", async (msg) => {


    const contact = msg.contact;


const photoUrl =
    await saveTelegramPhoto(
        contact.user_id
    );

    db.run(
        `
        INSERT INTO users
        (
            telegram_id,
            username,
            first_name,
            phone_number,
            photo_url
        )

        VALUES (?, ?, ?, ?, ?)


        ON CONFLICT(telegram_id)

        DO UPDATE SET

            username = excluded.username,
            first_name = excluded.first_name,
            phone_number = excluded.phone_number,
            photo_url = excluded.photo_url

        `,

        [
            contact.user_id,
            msg.from.username || "",
            msg.from.first_name || "",
            contact.phone_number,
            photoUrl
        ]

    );


    bot.sendMessage(
        msg.chat.id,

        "✅ Raqamingiz saqlandi.\n\nEndi /code yuborib kirish kodini oling.",

        {
            remove_keyboard: true
        }
    );


});




// Generate login code
bot.onText(/\/code/, (msg) => {


    const telegramId = msg.from.id;


    db.get(

        `
        SELECT *
        FROM users
        WHERE telegram_id = ?
        `,

        [
            telegramId
        ],

        async (err, user) => {


            if (
                !user ||
                !user.phone_number
            ) {


                bot.sendMessage(
                    msg.chat.id,

                    "❌ Avval raqamingizni jo'nating."
                );


                return;

            }



            const code =
                await createLoginCode(
                    telegramId
                );



            bot.sendMessage(

                msg.chat.id,


`🔒 Sizning login kodingiz


${code}


Bu birmartalik kod va u 3 daqiqa ta'sir qiladi.`,

                {

                    reply_markup: {

                        inline_keyboard: [

                            [
                                {
                                    text: "Login",
                                    url: `https://femutsu.uz/login/telegram?otp=${code}`
                                }
                            ],

                            [
                                {
                                    text: "Kodni yangilash",
                                    callback_data: "renew_code"
                                }
                            ]

                        ]

                    }

                }

            );


        }

    );


});