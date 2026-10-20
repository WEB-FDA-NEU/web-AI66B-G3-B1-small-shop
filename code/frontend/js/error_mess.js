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

function showLoading() {
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr class="loading-row">
            <td colspan="7">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>Loading employees...</p>
                </div>
            </td>
        </tr>
    `;
}

function hideLoading() {
  const loadingRow = tableBody?.querySelector(".loading-row");
  if (loadingRow) {
    loadingRow.remove();
  }
}
