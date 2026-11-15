import os
import sys

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, BACKEND_DIR)

from backend import main
from backend.services.auth import get_current_user


@pytest.fixture
def client():
    return TestClient(main.app)


def set_authenticated_role(role):
    main.app.dependency_overrides[get_current_user] = lambda: {
        "user_id": 1,
        "username": "test-user",
        "role": role,
    }


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    existing_overrides = main.app.dependency_overrides.copy()
    main.app.dependency_overrides.clear()
    yield
    main.app.dependency_overrides.clear()
    main.app.dependency_overrides.update(existing_overrides)


@pytest.mark.parametrize("role", ["Manager", "Admin"])
def test_management_roles_can_access_employee_api(client, monkeypatch, role):
    set_authenticated_role(role)
    monkeypatch.setattr(main, "get_all_employees", lambda: [])

    response = client.get("/employees")

    assert response.status_code == 200
    assert response.json() == []


def test_employee_is_denied_management_apis(client):
    set_authenticated_role("Employee")

    assert client.get("/employees").status_code == 403
    assert client.get("/users").status_code == 403
    assert client.get("/sales/overview").status_code == 403


def test_protected_api_requires_a_bearer_token(client):
    assert client.get("/customers").status_code == 401


def test_employee_can_access_only_their_own_employee_details(client, monkeypatch):
    set_authenticated_role("Employee")
    requested_usernames = []
    details = {
        "employee": {"employee_id": 4, "username": "test-user"},
        "stats": {"total_orders": 0, "total_sales": 0},
        "recent_orders": [],
    }
    monkeypatch.setattr(
        main,
        "get_employee_details_by_username",
        lambda username: requested_usernames.append(username) or details,
    )

    response = client.get("/auth/me/employee-details?id=999")

    assert response.status_code == 200
    assert response.json() == details
    assert requested_usernames == ["test-user"]
    assert client.get("/employees/4/details").status_code == 403


def test_authenticated_user_can_change_their_password(client, monkeypatch):
    set_authenticated_role("Employee")
    changes = []
    monkeypatch.setattr(
        main,
        "change_password",
        lambda user_id, new_password: changes.append((user_id, new_password)),
    )

    response = client.post(
        "/auth/change-password",
        json={"new_password": "updated-password"},
    )

    assert response.status_code == 200
    assert changes == [(1, "updated-password")]


def test_employee_can_view_inventory_but_cannot_change_it(client, monkeypatch):
    set_authenticated_role("Employee")
    monkeypatch.setattr(main, "get_all_inventory", lambda: [])
    inventory_item = {
        "product_name": "Coffee",
        "category_id": 1,
        "unit_price": 2,
        "stock_quantity": 3,
    }

    assert client.get("/inventory").status_code == 200
    assert client.post("/inventory", json=inventory_item).status_code == 403
    assert client.put("/inventory/INV-001", json=inventory_item).status_code == 403
    assert client.delete("/inventory/INV-001").status_code == 403


def test_employee_can_manage_customers_except_delete(client, monkeypatch):
    set_authenticated_role("Employee")
    monkeypatch.setattr(main, "get_customers", lambda: [])
    monkeypatch.setattr(main, "create_customer", lambda payload: {"customer_id": 2})
    monkeypatch.setattr(main, "update_customer", lambda customer_id, payload: {"customer_id": customer_id})
    customer = {
        "name": "Test Customer",
        "phone": "0123456789",
        "customer_type_id": 1,
    }

    assert client.get("/customers").status_code == 200
    assert client.post("/customers", json=customer).status_code == 201
    assert client.put("/customers/1", json=customer).status_code == 200
    assert client.delete("/customers/1").status_code == 403


def test_employee_can_create_orders_and_confirm_delivery(client, monkeypatch):
    set_authenticated_role("Employee")
    monkeypatch.setattr(main, "get_orders", lambda: [])
    monkeypatch.setattr(main, "create_order", lambda payload: {"order_id": 1})
    monkeypatch.setattr(
        main,
        "mark_order_delivered",
        lambda order_id: {
            "order_id": order_id,
            "created_at": "2026-11-15T00:00:00",
            "deliver_status": "delivered",
        },
    )
    order = {"username": "test-user", "items": [{"product_id": 1, "quantity": 1}]}

    assert client.get("/orders").status_code == 200
    assert client.post("/orders", json=order).status_code == 201
    response = client.patch("/orders/1/deliver")
    assert response.status_code == 200
    assert response.json()["deliver_status"] == "delivered"
    assert client.patch("/orders/1/note", json={"note": "change"}).status_code == 403
