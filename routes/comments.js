const express = require("express");
const router = express.Router();

const usersDb = require("../database/users");

function getTelegramId(req) {
    return (req.cookies && req.cookies.telegram_id) || null;
}

// POST /api/comments/:id/vote  { value: 1 | -1 }  toggles the vote off if repeated
router.post("/:id/vote", (req, res) => {

    const telegramId = getTelegramId(req);
    if (!telegramId) return res.status(401).json({ error: "Not authenticated" });

    const commentId = req.params.id;
    const value = Number(req.body && req.body.value);

    if (value !== 1 && value !== -1) {
        return res.status(400).json({ error: "value must be 1 or -1" });
    }

    usersDb.get(
        `SELECT * FROM comment_votes WHERE comment_id = ? AND telegram_id = ?`,
        [commentId, telegramId],
        (err, existing) => {

            if (err) return res.status(500).json({ error: "Database error" });

            if (existing && existing.value === value) {
                // same vote again -> remove it
                usersDb.run(`DELETE FROM comment_votes WHERE id = ?`, [existing.id], (e) => {
                    if (e) return res.status(500).json({ error: "Database error" });
                    res.json({ success: true, vote: null });
                });
            } else if (existing) {
                usersDb.run(
                    `UPDATE comment_votes SET value = ? WHERE id = ?`,
                    [value, existing.id],
                    (e) => {
                        if (e) return res.status(500).json({ error: "Database error" });
                        res.json({ success: true, vote: value });
                    }
                );
            } else {
                usersDb.run(
                    `INSERT INTO comment_votes (comment_id, telegram_id, value) VALUES (?, ?, ?)`,
                    [commentId, telegramId, value],
                    (e) => {
                        if (e) return res.status(500).json({ error: "Database error" });
                        res.json({ success: true, vote: value });
                    }
                );
            }

        }
    );

});

// DELETE /api/comments/:id - author (or admin/developer/owner) can delete
router.delete("/:id", (req, res) => {

    const telegramId = getTelegramId(req);
    if (!telegramId) return res.status(401).json({ error: "Not authenticated" });

    const commentId = req.params.id;

    usersDb.get(`SELECT * FROM comments WHERE id = ?`, [commentId], (err, comment) => {

        if (err) return res.status(500).json({ error: "Database error" });
        if (!comment) return res.status(404).json({ error: "Comment not found" });

        usersDb.get(`SELECT roles FROM users WHERE telegram_id = ?`, [telegramId], (err2, user) => {

            if (err2) return res.status(500).json({ error: "Database error" });

            const roles = ((user && user.roles) || "").split(",").map(r => r.trim().toLowerCase());
            const isPrivileged = roles.some(r => ["admin", "developer", "owner"].includes(r));

            if (comment.telegram_id !== telegramId && !isPrivileged) {
                return res.status(403).json({ error: "Access denied" });
            }

            usersDb.run(`DELETE FROM comments WHERE id = ? OR parent_id = ?`, [commentId, commentId], (err3) => {
                if (err3) return res.status(500).json({ error: "Database error" });
                res.json({ success: true });
            });

        });

    });

});

module.exports = router;
