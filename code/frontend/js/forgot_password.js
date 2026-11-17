document.addEventListener("DOMContentLoaded", () => {
    const forgotPasswordForm = document.getElementById("forgotPasswordForm");
    const usernameInput = document.getElementById("username");
    const messageContainer = document.getElementById("forgotPasswordMessage");
    const submitButton = forgotPasswordForm?.querySelector('button[type="submit"]');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const username = usernameInput.value.trim();
            if (!username) return;

            // Clear previous message states
            if (messageContainer) {
                messageContainer.textContent = "";
                messageContainer.style.color = "";
            }

            showButtonLoading(submitButton, "Sending...");
            try {
                const response = await fetch("http://127.0.0.1:8000/auth/forgot-password", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ username: username })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || "Failed to submit password reset request.");
                }

                // Display the success message inline below the button
                if (messageContainer) {
                    messageContainer.textContent = data.message;
                    messageContainer.style.color = "#C4E197"; // Vintage success green matching your theme
                } else {
                    alert(data.message);
                }

                // Clear the input
                usernameInput.value = "";

            } catch (error) {
                console.error(error);
                // Display the error message inline below the button
                if (messageContainer) {
                    messageContainer.textContent = error.message || "An error occurred. Please try again.";
                    messageContainer.style.color = "#F5C2C7"; // Vintage error red/pink matching your theme
                } else {
                    alert("An error occurred. Please try again.");
                }
            } finally {
                hideButtonLoading(submitButton);
            }
        });
    }
});