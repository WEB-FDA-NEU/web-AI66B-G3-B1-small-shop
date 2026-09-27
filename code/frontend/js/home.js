const menu_btn = document.querySelector(".menu-btn");
const main = document.querySelector(".main-content");
const sidebar = document.querySelector(".sidebar");

menu_btn.addEventListener("click", function() {
    main.classList.toggle("expand");
    sidebar.classList.toggle("hidden");
    menu_btn.classList.toggle("update");
})
