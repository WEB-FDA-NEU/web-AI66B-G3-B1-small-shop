document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "http://127.0.0.1:8000";
    const session = JSON.parse(sessionStorage.getItem("authenticatedUser") || "null");
    const allowedRoles = ["Admin", "Manager"];

    if (!session?.access_token || !allowedRoles.includes(session.role)) {
        window.location.replace("index.html");
        return;
    }

    const usersTableBody = document.getElementById("usersTableBody");
    const resetRequestsBody = document.getElementById("resetRequestsBody");
    const resetRequestsPanel = document.getElementById("resetRequestsPanel");
    const userSearch = document.getElementById("userSearch");
    const userModal = document.getElementById("userModal");
    const userForm = document.getElementById("userForm");
    const userIdInput = document.getElementById("userId");
    const usernameInput = document.getElementById("userUsername");
    const roleSelect = document.getElementById("userRole");
    const modalTitle = document.getElementById("userModalTitle");
    const passwordNote = document.getElementById("defaultPasswordNote");
    const saveButton = document.getElementById("saveUserBtn");
    const toast = document.getElementById("toastNotification");
    const menuButton = document.querySelector(".menu-btn");
    const sidebar = document.querySelector(".sidebar");
    const mainContent = document.querySelector(".main-content");
    let users = [];

    if (window.matchMedia("(max-width: 900px)").matches) {
        sidebar.classList.add("hidden");
        mainContent.classList.add("expand");
        menuButton.classList.add("update");
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        })[character]);
    }

    function formatDate(value) {
        if (!value) return "—";
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime())
            ? "—"
            : new Intl.DateTimeFormat("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }).format(parsed);
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        window.setTimeout(() => toast.classList.remove("show"), 3500);
    }

    async function request(path, options = {}) {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...options.headers,
            },
        });

        if (response.status === 401) {
            sessionStorage.removeItem("authenticatedUser");
            window.location.replace("index.html");
            throw new Error("Your session expired. Please sign in again.");
        }

        if (!response.ok) {
            let message = `Request failed (${response.status})`;
            try {
                const body = await response.json();
                message = body.detail || message;
            } catch {
                // Keep the HTTP status when the response is not JSON.
            }
            throw new Error(message);
        }

        return response.status === 204 ? null : response.json();
    }

    function renderUsers() {
        const query = userSearch.value.trim().toLowerCase();
        const filteredUsers = users.filter(user =>
            user.username.toLowerCase().includes(query)
            || String(user.user_id).includes(query)
        );

        document.getElementById("totalUsers").textContent = users.length;
        document.getElementById("totalManagers").textContent = users.filter(user =>
            allowedRoles.includes(user.role)
        ).length;

        if (!filteredUsers.length) {
            usersTableBody.innerHTML = `
                <tr><td colspan="6" class="table-message">No users found.</td></tr>
            `;
            return;
        }

        usersTableBody.innerHTML = filteredUsers.map(user => {
            const roleClass = user.role.toLowerCase().replace(/[^a-z0-9_-]/g, "");
            return `
                <tr>
                    <td class="user-id" data-label="User ID">USR-${String(user.user_id).padStart(3, "0")}</td>
                    <td data-label="Username">${escapeHTML(user.username)}</td>
                    <td data-label="Role"><span class="user-role-badge ${roleClass}">${escapeHTML(user.role)}</span></td>
                    <td data-label="Created At">${formatDate(user.created_at)}</td>
                    <td data-label="Reset Request">${user.reset_requested
                        ? '<span class="reset-status pending">Requested</span>'
                        : '<span class="reset-status">—</span>'}</td>
                    <td data-label="Actions">
                        <div class="user-actions">
                            <button type="button" class="user-action-reset" data-action="reset" data-id="${user.user_id}" aria-label="Reset password for ${escapeHTML(user.username)}" title="Reset password">
                                <i class="fa-solid fa-key" aria-hidden="true"></i> Reset
                            </button>
                            <button type="button" class="btn-icon" data-action="edit" data-id="${user.user_id}" aria-label="Edit ${escapeHTML(user.username)}" title="Edit user">
                                <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                            </button>
                            <button type="button" class="btn-icon delete user-delete" data-action="delete" data-id="${user.user_id}" aria-label="Delete ${escapeHTML(user.username)}" title="Delete user">
                                <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    async function loadUsers() {
        usersTableBody.innerHTML = `
            <tr><td colspan="6" class="table-message">Loading users...</td></tr>
        `;
        try {
            users = await request("/users");
            renderUsers();
        } catch (error) {
            usersTableBody.innerHTML = `
                <tr><td colspan="6" class="table-message">${escapeHTML(error.message)}</td></tr>
            `;
            showToast(`Could not load users: ${error.message}`);
        }
    }

    async function loadResetRequests() {
        try {
            const requests = await request("/auth/password-reset-requests");
            document.getElementById("resetRequestCount").textContent =
                `${requests.length} pending`;
            resetRequestsPanel.hidden = requests.length === 0;
            if (!requests.length) {
                resetRequestsBody.innerHTML = `
                    <tr><td colspan="4" class="table-message">No pending requests.</td></tr>
                `;
                return;
            }
            resetRequestsBody.innerHTML = requests.map(item => `
                <tr>
                    <td data-label="Username">${escapeHTML(item.username)}</td>
                    <td data-label="Role">${escapeHTML(item.role)}</td>
                    <td data-label="Requested At">${formatDate(item.requested_at)}</td>
                    <td data-label="Action">
                        <button type="button" class="approve-reset-button" data-action="approve-reset" data-id="${item.user_id}">
                            Reset to default
                        </button>
                    </td>
                </tr>
            `).join("");
        } catch (error) {
            resetRequestsPanel.hidden = false;
            resetRequestsBody.innerHTML = `
                <tr><td colspan="4" class="table-message">${escapeHTML(error.message)}</td></tr>
            `;
        }
    }

    function openModal(user = null) {
        userForm.reset();
        userIdInput.value = user ? user.user_id : "";
        usernameInput.value = user ? user.username : "";
        modalTitle.textContent = user ? "Edit User" : "Add User";
        passwordNote.hidden = Boolean(user);

        roleSelect.innerHTML = `
            <option value="Employee">Employee</option>
            <option value="Manager">Manager</option>
            <option value="Admin" ${session.role !== "Admin" && user?.role !== "Admin" ? "disabled" : ""}>Admin</option>
        `;
        roleSelect.value = user?.role || "Employee";
        userModal.classList.add("active");
        usernameInput.focus();
    }

    function closeModal() {
        userModal.classList.remove("active");
        userForm.reset();
    }

    document.getElementById("openAddUserBtn").addEventListener("click", () => openModal());
    document.getElementById("closeUserModalBtn").addEventListener("click", closeModal);
    document.getElementById("cancelUserModalBtn").addEventListener("click", closeModal);
    window.addEventListener("click", event => {
        if (event.target === userModal) closeModal();
    });
    userSearch.addEventListener("input", renderUsers);

    userForm.addEventListener("submit", async event => {
        event.preventDefault();
        saveButton.disabled = true;
        const userId = userIdInput.value;
        const method = userId ? "PUT" : "POST";
        const path = userId ? `/users/${userId}` : "/users";

        try {
            await request(path, {
                method,
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    role: roleSelect.value,
                }),
            });
            closeModal();
            await Promise.all([loadUsers(), loadResetRequests()]);
            showToast(userId ? "User updated." : "User created with the default password.");
        } catch (error) {
            showToast(`Could not save user: ${error.message}`);
        } finally {
            saveButton.disabled = false;
        }
    });

    usersTableBody.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const userId = Number(button.dataset.id);
        const user = users.find(item => item.user_id === userId);
        if (!user) return;

        if (button.dataset.action === "edit") {
            openModal(user);
            return;
        }

        if (button.dataset.action === "reset") {
            if (!window.confirm(`Reset ${user.username}'s password to password123?`)) return;
            try {
                await request(`/users/${userId}/reset-password`, { method: "POST" });
                await Promise.all([loadUsers(), loadResetRequests()]);
                showToast("Password reset successfully.");
            } catch (error) {
                showToast(`Could not reset password: ${error.message}`);
            }
            return;
        }

        if (button.dataset.action === "delete") {
            if (user.user_id === session.user_id) {
                showToast("You cannot delete the account you are currently using.");
                return;
            }
            if (!window.confirm(`Delete user ${user.username}? Any linked employee record will be kept without a login account.`)) return;
            try {
                await request(`/users/${userId}`, { method: "DELETE" });
                await Promise.all([loadUsers(), loadResetRequests()]);
                showToast("User deleted.");
            } catch (error) {
                showToast(`Could not delete user: ${error.message}`);
            }
        }
    });

    resetRequestsBody.addEventListener("click", async event => {
        const button = event.target.closest('button[data-action="approve-reset"]');
        if (!button) return;
        const userId = Number(button.dataset.id);
        const requestedUser = users.find(user => user.user_id === userId);
        const name = requestedUser?.username || "this account";
        if (!window.confirm(`Reset ${name}'s password to password123?`)) return;

        button.disabled = true;
        try {
            await request(`/auth/password-reset-requests/${userId}/approve`, { method: "POST" });
            await Promise.all([loadUsers(), loadResetRequests()]);
            showToast("Request approved. The user must change the temporary password after login.");
        } catch (error) {
            button.disabled = false;
            showToast(`Could not approve request: ${error.message}`);
        }
    });

    loadUsers();
    loadResetRequests();
});
