(() => {
    const apiOrigin = "http://127.0.0.1:8000";
    const page = window.location.pathname.split("/").pop();
    const publicPages = new Set(["index.html", "forgot_password.html"]);
    const userJson = sessionStorage.getItem("authenticatedUser");
    let user = null;

    if (userJson) {
        try {
            user = JSON.parse(userJson);
        } catch (error) {
            console.error("Unable to read the authenticated session.", error);
            sessionStorage.removeItem("authenticatedUser");
        }
    }

    if (!publicPages.has(page) && !user?.access_token) {
        window.location.replace("index.html");
        return;
    }

    if (user?.must_change_password && page !== "change_password.html") {
        window.location.replace("change_password.html");
        return;
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, options = {}) => {
        const requestUrl = new URL(
            input instanceof Request ? input.url : input,
            window.location.href
        );
        const isLocalApi = requestUrl.origin === apiOrigin;
        const isProductionApi = requestUrl.hostname === "small-shop-tailscale.onrender.com";
        if (!isLocalApi && !isProductionApi) {
            return originalFetch(input, options);
        }

        if (isProductionApi) {
            requestUrl.protocol = "http:";
            requestUrl.hostname = "127.0.0.1";
            requestUrl.port = "8000";
        }

        const headers = new Headers(
            options.headers || (input instanceof Request ? input.headers : undefined)
        );
        const currentSession = JSON.parse(
            sessionStorage.getItem("authenticatedUser") || "null"
        );
        if (currentSession?.access_token) {
            headers.set("Authorization", `Bearer ${currentSession.access_token}`);
        }

        const response = await originalFetch(requestUrl, {
            ...options,
            headers,
        });

        if (response.status === 401 && !requestUrl.pathname.endsWith("/auth/login")
            && !requestUrl.pathname.endsWith("/auth/forgot-password")) {
            sessionStorage.removeItem("authenticatedUser");
            window.location.replace("index.html");
        } else if (response.status === 403) {
            const body = await response.clone().json().catch(() => null);
            if (body?.detail === "Password change required.") {
                if (currentSession) {
                    currentSession.must_change_password = true;
                    sessionStorage.setItem("authenticatedUser", JSON.stringify(currentSession));
                }
                window.location.replace("change_password.html");
            }
        }

        return response;
    };
})();
