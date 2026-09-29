res.cookie(
    "telegram_id",
    user.telegram_id,
    {
        httpOnly:true,
        maxAge:1000 * 60 * 60 * 24 * 7
    }
);