const menu_btn = document.querySelector(".menu-btn");
const main = document.querySelector(".main-content");
const sidebar = document.querySelector(".sidebar");

if (menu_btn && main && sidebar) {
    menu_btn.addEventListener("click", function() {
        main.classList.toggle("expand");
        sidebar.classList.toggle("hidden");
        menu_btn.classList.toggle("update");
    });
}

const userJson = sessionStorage.getItem("authenticatedUser");
const welcomeUsername = document.querySelector("#welcome-username");
const userName = document.querySelector("#user-name");
const userRole = document.querySelector("#user-role");
const userAvatar = document.querySelector("#user-avatar");

if (userJson && welcomeUsername && userName && userRole && userAvatar) {
    const user = JSON.parse(userJson);
    const username = user.username || "";
    const roleNames = {
        Admin: "Administrator",
        Manager: "Manager",
        Cashier: "Cashier",
        Staff: "Staff",
    };
    const initials = username
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join("");

    welcomeUsername.textContent = username;
    userName.textContent = username;
    userRole.textContent = roleNames[user.role] || user.role || "";
    userAvatar.textContent = initials;
}