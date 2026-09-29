const express = require("express");
const router = express.Router();

const animeDb = require("../database/anime");
const usersDb = require("../database/users");

function getTelegramId(req) {
    return (req.cookies && req.cookies.telegram_id) || null;
}

function parseAnimeRow(row) {
    if (!row) return row;
    return {
        ...row,
        genre: row.genre ? row.genre.split(",").map(g => g.trim()).filter(Boolean) : []
    };
}

// ---------------------------------------------------------------
// GET /api/anime  - catalog list, optional filters:
//   ?status=ongoing&type=TV&genre=Isekai&search=torch&limit=24&offset=0
// ---------------------------------------------------------------
router.get("/", (req, res) => {

    const { status, type, genre, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 60, 200);
    const offset = parseInt(req.query.offset) || 0;

    const where = [];
    const params = [];

    if (status) { where.push("status = ?"); params.push(status); }
    if (type) { where.push("type = ?"); params.push(type); }
    if (genre) { where.push("genre LIKE ?"); params.push(`%${genre}%`); }
    if (search) { where.push("(anime_name LIKE ? OR original_name LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    animeDb.all(
        `SELECT * FROM animes ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
        (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Database error" });
            }
            res.json(rows.map(parseAnimeRow));
        }
    );

});

// ---------------------------------------------------------------
// GET /api/anime/:id - single anime + its episode list
// ---------------------------------------------------------------
router.get("/:id", (req, res) => {

    const id = req.params.id;

    animeDb.get("SELECT * FROM animes WHERE id = ?", [id], (err, anime) => {

        if (err) return res.status(500).json({ error: "Database error" });
        if (!anime) return res.status(404).json({ error: "Anime not found" });

        animeDb.all(
            `SELECT * FROM episodes WHERE anime_id = ? ORDER BY season ASC, episode_number ASC`,
            [id],
            (err2, episodes) => {

                if (err2) return res.status(500).json({ error: "Database error" });

                res.json({
                    ...parseAnimeRow(anime),
                    episodes_list: episodes
                });

            }
        );

    });

});

// ---------------------------------------------------------------
// GET /api/anime/:id/episodes
// ---------------------------------------------------------------
router.get("/:id/episodes", (req, res) => {

    animeDb.all(
        `SELECT * FROM episodes WHERE anime_id = ? ORDER BY season ASC, episode_number ASC`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json(rows);
        }
    );

});

// ---------------------------------------------------------------
// LIKES ("Yoqtirgan animelar")
// ---------------------------------------------------------------
router.get("/:id/like-status", (req, res) => {

    const telegramId = getTelegramId(req);
    if (!telegramId) return res.json({ liked: false });

    usersDb.get(
        `SELECT 1 FROM liked_animes WHERE telegram_id = ? AND anime_id = ?`,
        [telegramId, req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json({ liked: !!row });
        }
    );

});

router.post("/:id/like", (req, res) => {

    const telegramId = getTelegramId(req);
    if (!telegramId) return res.status(401).json({ error: "Not authenticated" });

    const animeId = req.params.id;

    usersDb.get(
        `SELECT id FROM liked_animes WHERE telegram_id = ? AND anime_id = ?`,
        [telegramId, animeId],
        (err, row) => {

            if (err) return res.status(500).json({ error: "Database error" });

            if (row) {
                usersDb.run(
                    `DELETE FROM liked_animes WHERE id = ?`,
                    [row.id],
                    (err2) => {
                        if (err2) return res.status(500).json({ error: "Database error" });
                        res.json({ liked: false });
                    }
                );
            } else {
                usersDb.run(
                    `INSERT INTO liked_animes (telegram_id, anime_id) VALUES (?, ?)`,
                    [telegramId, animeId],
                    (err2) => {
                        if (err2) return res.status(500).json({ error: "Database error" });
                        res.json({ liked: true });
                    }
                );
            }

        }
    );

});

// ---------------------------------------------------------------
// WATCH HISTORY / PROGRESS ("Saqlangan animelar")
// ---------------------------------------------------------------
router.post("/:id/watch", (req, res) => {

    const telegramId = getTelegramId(req);
    if (!telegramId) return res.status(401).json({ error: "Not authenticated" });

    const animeId = req.params.id;
    const { episode_id, episode_number, progress_seconds, completed } = req.body || {};

    usersDb.run(
        `
        INSERT INTO watched_animes
            (telegram_id, anime_id, episode_id, episode_number, progress_seconds, completed, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(telegram_id, anime_id) DO UPDATE SET
            episode_id = excluded.episode_id,
            episode_number = excluded.episode_number,
            progress_seconds = excluded.progress_seconds,
            completed = excluded.completed,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
            telegramId, animeId,
            episode_id || null,
            episode_number || null,
            progress_seconds || 0,
            completed ? 1 : 0
        ],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Database error" });
            }
            res.json({ success: true });
        }
    );

});

// ---------------------------------------------------------------
// COMMENTS
// ---------------------------------------------------------------
router.get("/:id/comments", (req, res) => {

    const animeId = req.params.id;
    const telegramId = getTelegramId(req);

    usersDb.all(
        `SELECT * FROM comments WHERE anime_id = ? ORDER BY created_at ASC`,
        [animeId],
        (err, comments) => {

            if (err) return res.status(500).json({ error: "Database error" });

            if (comments.length === 0) return res.json([]);

            const telegramIds = [...new Set(comments.map(c => c.telegram_id))];
            const placeholders = telegramIds.map(() => "?").join(",");

            usersDb.all(
                `SELECT telegram_id, username, first_name, photo_url, roles FROM users WHERE telegram_id IN (${placeholders})`,
                telegramIds,
                (err2, users) => {

                    if (err2) return res.status(500).json({ error: "Database error" });

                    const userMap = {};
                    users.forEach(u => { userMap[u.telegram_id] = u; });

                    const commentIds = comments.map(c => c.id);
                    const cPlaceholders = commentIds.map(() => "?").join(",");

                    usersDb.all(
                        `SELECT comment_id, value FROM comment_votes WHERE comment_id IN (${cPlaceholders})`,
                        commentIds,
                        (err3, votes) => {

                            if (err3) return res.status(500).json({ error: "Database error" });

                            const voteMap = {};
                            votes.forEach(v => {
                                if (!voteMap[v.comment_id]) voteMap[v.comment_id] = { likes: 0, dislikes: 0 };
                                if (v.value > 0) voteMap[v.comment_id].likes++;
                                else voteMap[v.comment_id].dislikes++;
                            });

                            const enriched = comments.map(c => ({
                                id: c.id,
                                anime_id: c.anime_id,
                                parent_id: c.parent_id,
                                content: c.content,
                                created_at: c.created_at,
                                user: userMap[c.telegram_id] ? {
                                    telegram_id: c.telegram_id,
                                    username: userMap[c.telegram_id].username,
                                    first_name: userMap[c.telegram_id].first_name,
                                    photo_url: userMap[c.telegram_id].photo_url,
                                    roles: userMap[c.telegram_id].roles
                                } : { telegram_id: c.telegram_id, first_name: "Foydalanuvchi" },
                                likes: (voteMap[c.id] && voteMap[c.id].likes) || 0,
                                dislikes: (voteMap[c.id] && voteMap[c.id].dislikes) || 0
                            }));

                            // build a tree: top-level comments with nested replies
                            const byId = {};
                            enriched.forEach(c => { byId[c.id] = { ...c, replies: [] }; });

                            const roots = [];
                            enriched.forEach(c => {
                                if (c.parent_id && byId[c.parent_id]) {
                                    byId[c.parent_id].replies.push(byId[c.id]);
                                } else {
                                    roots.push(byId[c.id]);
                                }
                            });

                            res.json(roots);

                        }
                    );

                }
            );

        }
    );

});

router.post("/:id/comments", (req, res) => {

    const telegramId = getTelegramId(req);
    if (!telegramId) return res.status(401).json({ error: "Not authenticated" });

    const animeId = req.params.id;
    const { content, parent_id } = req.body || {};

    if (!content || !content.trim()) {
        return res.status(400).json({ error: "Comment content required" });
    }

    usersDb.run(
        `INSERT INTO comments (anime_id, telegram_id, parent_id, content) VALUES (?, ?, ?, ?)`,
        [animeId, telegramId, parent_id || null, content.trim().slice(0, 2000)],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Database error" });
            }
            res.json({ success: true, id: this.lastID });
        }
    );

});

module.exports = router;
