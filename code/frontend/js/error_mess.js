let toastTimeout;

function showToast(message, type = "success") {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;

    clearTimeout(toastTimeout);

    toast.textContent = message;
    toast.classList.remove("show", "toast-success", "toast-error", "toast-warning");
    toast.classList.add(`toast-${type}`);

    // Allow the browser to apply the updated notification state.
    requestAnimationFrame(() => {
        toast.classList.add("show");
    });
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

async function getApiErrorMessage(response) {
    let data = {};
    try {
        data = await response.json();
    } catch {
        // The response may not contain JSON.
    }

    // Avoid displaying raw server or database details.
    if (response.status >= 500) {
        return "Something went wrong on the server. Please try again later.";
    }

    if (typeof data.detail === "string" && data.detail.trim()) {
        return data.detail;
    }

    const fallbackMessages = {
        400: "We couldn't process your request. Please check your information.",
        401: "Your session may have expired. Please sign in again.",
        403: "You don't have permission to perform this action.",
        404: "This item could not be found. Please refresh and try again.",
        409: "This action conflicts with existing data. Please check and try again.",
        422: "Some information is missing or invalid. Please review your input."
    };

    return fallbackMessages[response.status]
        || "We couldn't complete your request. Please try again.";
}

function showNetworkError() {
    showToast(
        "Unable to connect to the server. Please check your connection and try again.",
        "error"
    );
}

// ==================== LOADING STATE ====================

function showTableLoading(target, colspan, message = "Loading...") {
    const body = typeof target === "string"
        ? document.getElementById(target)
        : target;
    if (!body) return;

    const row = document.createElement("tr");
    row.className = "loading-row";

    const cell = document.createElement("td");
    cell.colSpan = colspan;

    const content = document.createElement("div");
    content.className = "loading-content";

    const spinner = document.createElement("div");
    spinner.className = "loading-spinner";
    spinner.setAttribute("aria-hidden", "true");

    const label = document.createElement("p");
    label.textContent = message;

    content.append(spinner, label);
    cell.appendChild(content);
    row.appendChild(cell);
    body.replaceChildren(row);
}

function hideTableLoading(target) {
    const body = typeof target === "string"
        ? document.getElementById(target)
        : target;
    body?.querySelector(".loading-row")?.remove();
}

function showButtonLoading(button, message = "Loading...") {
    if (!button || button.dataset.loading === "true") return;

    button.dataset.loading = "true";
    button.dataset.loadingOriginalHtml = button.innerHTML;
    button.dataset.loadingWasDisabled = String(button.disabled);
    button.disabled = true;
    button.setAttribute("aria-busy", "true");

    const content = document.createElement("span");
    content.className = "loading-button-content";

    const spinner = document.createElement("span");
    spinner.className = "loading-spinner loading-spinner-button";
    spinner.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.textContent = message;

    content.append(spinner, label);
    button.replaceChildren(content);
}

function hideButtonLoading(button) {
    if (!button || button.dataset.loading !== "true") return;

    button.innerHTML = button.dataset.loadingOriginalHtml;
    button.disabled = button.dataset.loadingWasDisabled === "true";
    button.removeAttribute("aria-busy");
    delete button.dataset.loading;
    delete button.dataset.loadingOriginalHtml;
    delete button.dataset.loadingWasDisabled;
}

function showLoading() {
    showTableLoading("employeeTableBody", 7, "Loading employees...");
}

function hideLoading() {
    hideTableLoading("employeeTableBody");
}
