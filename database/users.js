const sqlite3 = require("sqlite3").verbose();
const path = require("path");


const dbPath = path.join(
    __dirname,
    "users.db"
);


const db = new sqlite3.Database(dbPath);


db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT UNIQUE NOT NULL,
            username TEXT,
            first_name TEXT,
            phone_number TEXT,
            photo_url TEXT,
            roles TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);



    db.run(`
        CREATE TABLE IF NOT EXISTS login_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT NOT NULL,
            code TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            used INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);



    // migration for old database
    db.all(
        "PRAGMA table_info(users)",
        (err, columns) => {

            if (err) return;



            const hasPhoto =
                columns.some(
                    col => col.name === "photo_url"
                );



            if (!hasPhoto) {

                db.run(`
                    ALTER TABLE users
                    ADD COLUMN photo_url TEXT
                `);

                console.log(
                    "photo_url column added"
                );

            }



            const hasRoles =
                columns.some(
                    col => col.name === "roles"
                );



            if (!hasRoles) {

                db.run(`
                    ALTER TABLE users
                    ADD COLUMN roles TEXT DEFAULT 'user'
                `);

                console.log(
                    "roles column added"
                );

            }


        }
    );


});


module.exports = db;