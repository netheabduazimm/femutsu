const db = require("./database/users");


const telegramId = process.argv[2];
const newRoles = process.argv[3];


console.log("ID:", telegramId);
console.log("Roles:", newRoles);


db.run(
    `
    UPDATE users
    SET roles = ?
    WHERE telegram_id = ?
    `,
    [
        newRoles,
        telegramId
    ],

    function(err){

        if(err){
            console.error(err);
            return;
        }


        console.log("Changed rows:", this.changes);


        if(this.changes === 0){
            console.log("❌ User not found");
        }
        else {
            console.log("✅ Role updated");
        }


        db.close();

    }
);