const changePasswordForm = document.querySelector("#changePasswordForm");

if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async event => {
        event.preventDefault();

        const newPassword = changePasswordForm.elements.newPassword.value;
        const confirmPassword = changePasswordForm.elements.confirmPassword.value;
        const message = document.querySelector("#changePasswordMessage");
        const submitButton = changePasswordForm.querySelector('button[type="submit"]');

        if (message) message.textContent = "";
        if (newPassword !== confirmPassword) {
            if (message) message.textContent = "The passwords do not match.";
            return;
        }

        if (submitButton) submitButton.disabled = true;
        try {
            const response = await fetch("http://127.0.0.1:8000/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ new_password: newPassword })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.detail || "Unable to change password.");
            }

            const user = window.currentUser;
            user.must_change_password = false;
            sessionStorage.setItem("authenticatedUser", JSON.stringify(user));
            window.location.replace(
                user.role === "Employee" ? "employee_details.html" : "sales.html"
            );
        } catch (error) {
            if (message) {
                message.textContent = error.message || "Unable to connect to the server.";
            }
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}
