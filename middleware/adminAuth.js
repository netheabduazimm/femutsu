const db = require("../database/users");


module.exports = function(req,res,next){


    const telegram_id =
        req.cookies.telegram_id;


    if(!telegram_id){

        return res.status(401).send(
            "Not logged in"
        );

    }



    db.get(
        `
        SELECT roles
        FROM users
        WHERE telegram_id = ?
        `,
        [telegram_id],

        (err,user)=>{


            if(err){

                console.error(err);

                return res.status(500)
                .send("Database error");

            }


            if(!user){

                return res.status(403)
                .send("User not found");

            }



            const roles =
                (user.roles || "user")
                .split(",")
                .map(r => r.trim().toLowerCase());



            if(
                roles.includes("developer") ||
                roles.includes("admin") ||
                roles.includes("owner")
            ){

                next();

            }
            else{

                res.status(403)
                .send("Access denied");

            }


        }
    );


};