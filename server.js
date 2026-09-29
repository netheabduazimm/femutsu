const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();

const authRoutes = require("./routes/auth");

app.set("trust proxy", true);
const dashboardRoutes = require("./routes/dashboard");
const db = require("./database/users");

require("./bot");


app.use(express.json());
app.use(cookieParser());


app.use(express.static(path.join(__dirname, "public")));


// API
app.use("/api/auth", authRoutes);


// Protected pages
app.use("/dashboard", dashboardRoutes);

// Pages

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "views", "index.html")
    );
});

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

app.get("/login", (req, res) => {
    res.sendFile(
        path.join(__dirname, "views", "login.html")
    );
});
app.get("/login/telegram", (req, res) => {
    res.sendFile(
        path.join(__dirname, "views", "telegram-login.html")
    );
});
app.get("/telegram", (req, res) => {
    res.sendFile(
        path.join(__dirname, "views", "tg_register.html")
    );
});

app.get("/user/:telegram_id", (req, res) => {

    const telegramId = req.params.telegram_id;

    db.get(
        "SELECT * FROM users WHERE telegram_id = ?",
        [telegramId],
        (err, user) => {

            if (err) {
                console.log(err);
                return res.status(500).send("Server error");
            }

            if (!user) {
                return res.status(404).send("User not found");
            }

            res.sendFile(
                path.join(__dirname, "views", "profile.html")
            );

        }
    );

});
app.get("/api/user/:telegram_id", (req,res)=>{

    db.get(
        "SELECT * FROM users WHERE telegram_id=?",
        [req.params.telegram_id],
        (err,user)=>{

            if(err)
                return res.status(500).json(err);

            if(!user)
                return res.status(404).json({
                    error:"User not found"
                });

            res.json(user);

        }
    );

});

const PORT = 3000;


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});