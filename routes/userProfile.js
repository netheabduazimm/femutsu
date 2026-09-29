const express = require("express");
const router = express.Router();

const usersDb = require("../database/users");
const animeDb = require("../database/anime");

function attachAnimeInfo(rows, animeIdKey, callback) {

    if (!rows.length) return callback([]);

    const ids = [...new Set(rows.map(r => r[animeIdKey]))];
    const placeholders = ids.map(() => "?").join(",");

    animeDb.all(
        `SELECT id, anime_name, original_name, poster, rating, type, status FROM animes WHERE id IN (${placeholders})`,
        ids,
        (err, animes) => {

            if (err) return callback([]);

            const map = {};
            animes.forEach(a => { map[a.id] = a; });

            const result = rows
                .map(r => ({ ...r, anime: map[r[animeIdKey]] || null }))
                .filter(r => r.anime); // drop rows pointing at removed anime

            callback(result);

        }
    );

}

// GET /api/user/:telegram_id/liked
router.get("/:telegram_id/liked", (req, res) => {

    usersDb.all(
        `SELECT anime_id, created_at FROM liked_animes WHERE telegram_id = ? ORDER BY created_at DESC`,
        [req.params.telegram_id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: "Database error" });
            attachAnimeInfo(rows, "anime_id", (result) => res.json(result));
        }
    );

});

// GET /api/user/:telegram_id/watched
router.get("/:telegram_id/watched", (req, res) => {

    usersDb.all(
        `SELECT anime_id, episode_id, episode_number, progress_seconds, completed, updated_at
         FROM watched_animes WHERE telegram_id = ? ORDER BY updated_at DESC`,
        [req.params.telegram_id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: "Database error" });
            attachAnimeInfo(rows, "anime_id", (result) => res.json(result));
        }
    );

});

// GET /api/user/:telegram_id/comments
router.get("/:telegram_id/comments", (req, res) => {

    usersDb.all(
        `SELECT id, anime_id, parent_id, content, created_at FROM comments WHERE telegram_id = ? ORDER BY created_at DESC`,
        [req.params.telegram_id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: "Database error" });
            attachAnimeInfo(rows, "anime_id", (result) => res.json(result));
        }
    );

});

module.exports = router;
