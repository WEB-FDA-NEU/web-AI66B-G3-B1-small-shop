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

let authenticatedUser = {};
const userJson = sessionStorage.getItem("authenticatedUser");

if (userJson) {
    try {
        authenticatedUser = JSON.parse(userJson) || {};
    } catch (error) {
        console.error("Unable to read the authenticated user's profile.", error);
    }
}

const roleNames = {
    Admin: "Administrator",
    Manager: "Manager",
    Cashier: "Cashier",
    Staff: "Staff",
};
const username = authenticatedUser.username || "";
const role = roleNames[authenticatedUser.role] || authenticatedUser.role || "";
const initials = username
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");
const welcomeUsername = document.querySelector("#welcome-username");

if (welcomeUsername) {
    welcomeUsername.textContent = username;
}


let profile = document.querySelector(".user-profile, .account-card");

if (profile) {
    const avatar = profile.querySelector(".user-avatar, .avatar");
    const name = profile.querySelector(".user-name, .role-name");
    const userRole = profile.querySelector(".user-role, .role-sub");

    if (avatar) avatar.textContent = initials;
    if (name) name.textContent = username;
    if (userRole) userRole.textContent = role;

    const container = document.createElement("div");
    container.className = "profile-menu-container";
    profile.before(container);
    container.append(profile);

    profile.setAttribute("role", "button");
    profile.setAttribute("tabindex", "0");
    profile.setAttribute("aria-haspopup", "true");
    profile.setAttribute("aria-expanded", "false");
    profile.setAttribute("aria-controls", "profile-dropdown");

    const dropdown = document.createElement("div");
    dropdown.className = "profile-dropdown";
    dropdown.id = "profile-dropdown";
    dropdown.hidden = true;
    dropdown.innerHTML = `
        <section class="profile-dropdown-account" aria-label="Account Information">
            <div class="profile-dropdown-user">
                <div class="profile-dropdown-avatar" aria-hidden="true"></div>
                <div class="profile-dropdown-user-info">
                    <strong class="profile-dropdown-name"></strong>
                    <span class="profile-dropdown-role"></span>
                </div>
            </div>
        </section>
        <div class="profile-dropdown-links">
            <button type="button" class="profile-dropdown-item">
                <i class="fa-regular fa-user" aria-hidden="true"></i>
                My Profile
            </button>
            <button type="button" class="profile-dropdown-item">
                <i class="fa-solid fa-gear" aria-hidden="true"></i>
                Settings
            </button>
            <button type="button" class="profile-dropdown-item">
                <i class="fa-regular fa-circle-question" aria-hidden="true"></i>
                Help
            </button>
        </div>
        <div class="profile-dropdown-logout">
            <button type="button" class="profile-dropdown-item">
                <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
                Log out
            </button>
        </div>
    `;
    container.append(dropdown);
    dropdown.querySelector(".profile-dropdown-avatar").textContent = initials;
    dropdown.querySelector(".profile-dropdown-name").textContent = username;
    dropdown.querySelector(".profile-dropdown-role").textContent = role;

    let openAnimationFrame = 0;
    const setDropdownOpen = isOpen => {
        profile.setAttribute("aria-expanded", String(isOpen));
        cancelAnimationFrame(openAnimationFrame);

        if (isOpen) {
            dropdown.hidden = false;
            openAnimationFrame = requestAnimationFrame(() => {
                dropdown.classList.add("is-open");
            });
        } else {
            dropdown.classList.remove("is-open");
            dropdown.hidden = true;
        }
    };

    profile.addEventListener("click", () => {
        setDropdownOpen(dropdown.hidden);
    });
    profile.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setDropdownOpen(dropdown.hidden);
        }
    });
    document.addEventListener("click", event => {
        if (!container.contains(event.target)) {
            setDropdownOpen(false);
        }
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !dropdown.hidden) {
            setDropdownOpen(false);
            profile.focus();
        }
    });
    dropdown.querySelector(".profile-dropdown-logout").addEventListener("click", () => {
        sessionStorage.removeItem("authenticatedUser");
        window.location.href = "index.html";
    });
}
