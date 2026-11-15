(() => {
    if (window.YUMSSessionLoaded) return;
    window.YUMSSessionLoaded = true;

    const storageKey = "authenticatedUser";
    const loginPage = "index.html";
    const userJson = sessionStorage.getItem(storageKey);
    let user;

    try {
        user = userJson ? JSON.parse(userJson) : null;
    } catch (error) {
        console.error("Unable to read the authenticated user's session.", error);
    }

    if (!user || !user.access_token) {
        sessionStorage.removeItem(storageKey);
        window.location.replace(loginPage);
        return;
    }

    const page = window.location.pathname.split("/").pop() || "";
    const employeePages = new Set([
        "home.html",
        "order_create_edit.html",
        "order_view.html",
        "order_check.html",
        "customers.html",
        "customers_detail.html",
        "inventory.html",
        "employee_details.html",
        "change_password.html"
    ]);

    if (user.role === "Employee" && !employeePages.has(page)) {
        window.location.replace("home.html");
        return;
    }

    if (user.must_change_password && page !== "change_password.html") {
        window.location.replace("change_password.html");
        return;
    }
    if (!user.must_change_password && page === "change_password.html") {
        window.location.replace("home.html");
        return;
    }

    window.currentUser = user;
    document.documentElement.classList.add(
        `role-${String(user.role).toLowerCase()}`,
        `page-${page.replace(/\.html$/, "").replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`
    );

    const roleStyles = document.createElement("style");
    roleStyles.textContent = `
        html.role-employee .sidebar-menu a[href="employees.html"],
        html.role-employee .sidebar-menu a[href="employee_details.html"],
        html.role-employee .sidebar-menu a[href="sales.html"],
        html.role-employee .sidebar-menu a[href="users.html"],
        html.role-employee #backToEmployees {
            display: none !important;
        }
        html.page-customers.role-employee #deleteCustomerModal {
            display: none !important;
        }
        html.page-inventory.role-employee #openAddModalBtn,
        html.page-inventory.role-employee #productModal,
        html.page-inventory.role-employee .inventory-table th:last-child {
            display: none !important;
        }
    `;
    document.head.appendChild(roleStyles);

    const apiPaths = [
        "/auth/",
        "/users",
        "/employees",
        "/customers",
        "/orders",
        "/products",
        "/inventory",
        "/categories",
        "/sales"
    ];
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
        const requestUrl = new URL(
            typeof input === "string" ? input : input.url,
            window.location.href
        );
        const isApiRequest = apiPaths.some(path => requestUrl.pathname.startsWith(path));
        const isPublicAuthRequest =
            requestUrl.pathname === "/auth/login" ||
            requestUrl.pathname === "/auth/forgot-password";
        const headers = new Headers(input instanceof Request ? input.headers : undefined);

        if (init.headers) {
            new Headers(init.headers).forEach((value, name) => headers.set(name, value));
        }
        if (isApiRequest && !isPublicAuthRequest) {
            headers.set("Authorization", `Bearer ${user.access_token}`);
        }

        const response = await nativeFetch(input, { ...init, headers });
        if (isApiRequest && response.status === 401) {
            sessionStorage.removeItem(storageKey);
            window.location.replace(loginPage);
        }
        return response;
    };
})();
