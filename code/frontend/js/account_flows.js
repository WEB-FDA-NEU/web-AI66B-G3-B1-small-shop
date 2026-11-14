const forgotPasswordForm = document.querySelector("#forgotPasswordForm");
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async event => {
        event.preventDefault();
        const message = document.querySelector("#forgotPasswordMessage");
        const button = forgotPasswordForm.querySelector('button[type="submit"]');
        button.disabled = true;
        message.textContent = "";

        try {
            const response = await fetch("http://127.0.0.1:8000/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: forgotPasswordForm.elements.username.value.trim(),
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.detail || "Unable to send the request.");
            }
            message.textContent = result.message;
            forgotPasswordForm.reset();
        } catch (error) {
            message.textContent = error.message || "Unable to connect to the server.";
        } finally {
            button.disabled = false;
        }
    });
}

const changePasswordForm = document.querySelector("#changePasswordForm");
if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async event => {
        event.preventDefault();
        const message = document.querySelector("#changePasswordMessage");
        const button = changePasswordForm.querySelector('button[type="submit"]');
        const newPassword = changePasswordForm.elements.newPassword.value;
        const confirmation = changePasswordForm.elements.confirmPassword.value;
        if (newPassword !== confirmation) {
            message.textContent = "The passwords do not match.";
            return;
        }

        button.disabled = true;
        message.textContent = "";
        try {
            const response = await fetch("http://127.0.0.1:8000/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ new_password: newPassword }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.detail || "Unable to change the password.");
            }

            const user = JSON.parse(sessionStorage.getItem("authenticatedUser"));
            user.must_change_password = false;
            sessionStorage.setItem("authenticatedUser", JSON.stringify(user));
            window.location.replace("home.html");
        } catch (error) {
            message.textContent = error.message || "Unable to connect to the server.";
        } finally {
            button.disabled = false;
        }
    });
}
