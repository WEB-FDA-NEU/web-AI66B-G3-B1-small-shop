// CHARACTER EYES

const leftEye = document.querySelector(".left-eye");
const rightEye = document.querySelector(".right-eye");

const character = document.querySelector(".character");

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

    // Maximum distance that the pupils can move
    const distance = 5;

    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    leftEye.style.transform = `translate(${x}px, ${y}px)`;
    rightEye.style.transform = `translate(${x}px, ${y}px)`;
});

// LOGIN
const loginForm = document.querySelector(".login-form");

loginForm.addEventListener("submit", function(event) {
    event.preventDefault();
    window.location.href = "../html/home.html";
});