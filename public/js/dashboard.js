// ============================================================
// Femutsu Dashboard — Real database users
// ============================================================


let USERS = [];

const usersBody = document.getElementById("users");
const searchInput = document.getElementById("userSearch");



async function loadUsers() {

    try {

        const response = await fetch(
            "/dashboard/api/users"
        );


        if (!response.ok) {
            throw new Error("Failed to load users");
        }


        USERS = await response.json();


        renderUsers(USERS);
        updateStats(USERS);


    } catch(error) {

        console.error(
            "Dashboard users error:",
            error
        );


        usersBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">
                    Failed to load users
                </td>
            </tr>
        `;

    }

}




function roleBadge(role) {

    const name =
        role.charAt(0).toUpperCase()
        +
        role.slice(1);


    return `
        <span class="role-badge ${role}">
            ${name}
        </span>
    `;

}





function renderRow(user) {


    const roles = user.roles
        ? user.roles.split(",")
        : ["user"];


    const rolesHTML =
        roles
        .map(role => roleBadge(role.trim()))
        .join("");



    return `

    <tr data-user-id="${user.id}">

        <td>

            <div class="user-cell">

                <img 
                src="${user.photo_url || user.photo || user.profile_photo || "/assets/default-avatar.svg"}"
                alt=""
                onerror="this.onerror=null;this.src='/assets/default-avatar.svg';">


                <strong>
                    ${user.username || user.first_name || "Unknown"}
                </strong>


            </div>

        </td>



        <td>

            <div class="role-pills">

                ${rolesHTML}

            </div>

        </td>



        <td>

            <span class="title-empty">
                No title
            </span>

        </td>



        <td>

            <button 
            class="edit-link"
            data-edit="${user.id}">

                Edit

            </button>

        </td>


    </tr>

    `;

}





function renderUsers(users) {


    if(!users.length){

        usersBody.innerHTML = `

        <tr class="empty-row">

            <td colspan="4">
                No users found
            </td>

        </tr>

        `;

        return;

    }



    usersBody.innerHTML =
        users
        .map(renderRow)
        .join("");

}






function updateStats(users){


    document.getElementById(
        "statTotalUsers"
    ).textContent =
        users.length;



    document.getElementById(
        "statDevelopers"
    ).textContent =
        users.filter(
            user =>
            user.roles.includes("developer")
        ).length;



    document.getElementById(
        "statSupporters"
    ).textContent =
        users.filter(
            user =>
            user.roles.includes("supporter")
        ).length;


}







searchInput?.addEventListener(
    "input",
    (event)=>{


        const query =
            event.target.value
            .toLowerCase();



        const filtered =
            USERS.filter(user=>{


                const name =
                    (
                    user.username ||
                    user.first_name ||
                    ""
                    )
                    .toLowerCase();



                return name.includes(query);


            });



        renderUsers(filtered);


    }
);






usersBody?.addEventListener(
    "click",
    event=>{


        const button =
            event.target.closest("[data-edit]");


        if(!button)
            return;



        const id =
            button.dataset.edit;



        const user =
            USERS.find(
                u=>u.id == id
            );


        console.log(
            "Edit user:",
            user
        );


    }
);






loadUsers();