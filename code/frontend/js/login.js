// CHARACTER EYES

const leftEye = document.querySelector(".left-eye");
const rightEye = document.querySelector(".right-eye");

const character = document.querySelector(".character");

if (character) {
    document.addEventListener("mousemove", function(event) {
        const rect = character.getBoundingClientRect();

        const characterX = rect.left + rect.width / 2;
        const characterY = rect.top + rect.height / 2;

        const mouseX = event.clientX;
        const mouseY = event.clientY;

        const angle = Math.atan2(
            mouseY - characterY,
            mouseX - characterX
        );

        const distance = 5;

        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        if (leftEye) leftEye.style.transform = `translate(${x}px, ${y}px)`;
        if (rightEye) rightEye.style.transform = `translate(${x}px, ${y}px)`;
    });
}

// LOGIN
const loginForm = document.querySelector(".login-form");

if (loginForm) {
    loginForm.addEventListener("submit", function(event) {
        event.preventDefault();
        window.location.href = "../html/home.html";
    });
}

document.querySelectorAll(".password-toggle").forEach(toggle => {
    const passwordInput = toggle.closest(".form-group")?.querySelector("input");
    const icon = toggle.querySelector("i");

    if (!passwordInput) return;

    toggle.type = "button";
    toggle.setAttribute("aria-label", "Show password");
    toggle.addEventListener("click", () => {
        const showPassword = passwordInput.type === "password";
        passwordInput.type = showPassword ? "text" : "password";
        toggle.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
        if (icon) {
            icon.classList.toggle("fa-eye", showPassword);
            icon.classList.toggle("fa-eye-slash", !showPassword);
            icon.classList.remove("fa-lock");
        }
    });
});