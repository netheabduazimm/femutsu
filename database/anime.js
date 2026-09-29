const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "anime.db");

const db = new sqlite3.Database(dbPath);

db.serialize(() => {

    // Main catalog table
    db.run(`
        CREATE TABLE IF NOT EXISTS animes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anime_name TEXT NOT NULL,
            original_name TEXT,
            description TEXT,
            poster TEXT,
            rating REAL DEFAULT 0,
            type TEXT,
            genre TEXT,
            episodes INTEGER DEFAULT 0,
            seasons INTEGER DEFAULT 1,
            status TEXT DEFAULT 'ongoing',
            release_date TEXT,
            age_rating TEXT,
            age_restriction TEXT,
            avg_episode_length INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Episodes / uploaded video files for each anime.
    // Video files themselves live on disk at uploads/anime/{anime_id}/...
    db.run(`
        CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anime_id INTEGER NOT NULL,
            season INTEGER DEFAULT 1,
            episode_number INTEGER NOT NULL,
            title TEXT,
            video_path TEXT NOT NULL,
            duration INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_episodes_anime
        ON episodes (anime_id, season, episode_number)
    `);

    // Basic migration helper for older anime.db files
    db.all("PRAGMA table_info(animes)", (err, columns) => {

        if (err || !columns || columns.length === 0) return;

        const wanted = {
            avg_episode_length: "INTEGER",
            age_restriction: "TEXT",
            age_rating: "TEXT"
        };

        Object.keys(wanted).forEach(col => {
            const has = columns.some(c => c.name === col);
            if (!has) {
                db.run(`ALTER TABLE animes ADD COLUMN ${col} ${wanted[col]}`);
            }
        });

    });

});

module.exports = db;
