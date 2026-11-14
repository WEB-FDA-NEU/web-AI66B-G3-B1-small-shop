import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, BACKEND_DIR)

import pytest
from fastapi import HTTPException

from backend import main


def test_employee_dashboard_uses_authenticated_username(monkeypatch):
    profile = {"employee_id": 7, "username": "employee1"}
    expected = {
        "employee": profile,
        "stats": {"total_orders": 2, "total_sales": 80000},
        "monthly_sales": [
            {"month": "2026-10", "order_count": 1, "revenue": 30000},
            {"month": "2026-11", "order_count": 1, "revenue": 50000},
        ],
        "recent_orders": [],
    }
    requested_usernames = []

    def find_employee(username):
        requested_usernames.append(username)
        return profile

    monkeypatch.setattr(main, "get_employee_by_username", find_employee)
    monkeypatch.setattr(main, "get_employee_details", lambda employee_id: expected)

    result = main.get_employee_dashboard_endpoint(
        {"role": "Employee", "username": "employee1"}
    )

    assert result == expected
    assert requested_usernames == ["employee1"]


def test_non_employee_cannot_use_employee_dashboard(monkeypatch):
    def unexpected_lookup(username):
        pytest.fail("Dashboard must reject non-employees before looking up an employee.")

    monkeypatch.setattr(main, "get_employee_by_username", unexpected_lookup)

    with pytest.raises(HTTPException) as error:
        main.get_employee_dashboard_endpoint(
            {"role": "Manager", "username": "manager1"}
        )

    assert error.value.status_code == 403


def test_employee_cannot_read_another_employees_details(monkeypatch):
    details_called = False
    monkeypatch.setattr(
        main,
        "get_employee_by_id",
        lambda employee_id: {"employee_id": employee_id, "username": "employee2"},
    )

    def get_details(employee_id):
        nonlocal details_called
        details_called = True
        return {}

    monkeypatch.setattr(main, "get_employee_details", get_details)

    with pytest.raises(HTTPException) as error:
        main.get_employee_details_endpoint(
            2,
            {"role": "Employee", "username": "employee1"},
        )

    assert error.value.status_code == 403
    assert not details_called


def test_employee_can_read_own_details(monkeypatch):
    expected = {"employee": {}, "stats": {}, "recent_orders": []}
    monkeypatch.setattr(
        main,
        "get_employee_by_id",
        lambda employee_id: {"employee_id": employee_id, "username": "employee1"},
    )
    monkeypatch.setattr(main, "get_employee_details", lambda employee_id: expected)

    assert main.get_employee_details_endpoint(
        1,
        {"role": "Employee", "username": "employee1"},
    ) == expected
