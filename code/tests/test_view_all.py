import pytest

from tests.fakes import FakeViewOrderRepo
from backend.services.test_order import (
    view_all_orders,
    OrderError
)

# TC-10
def test_tc10_view_five_orders():

    repo = FakeViewOrderRepo([
        {"order_id": 1, "deliver_status": "delivered", "included_in_sales": True},
        {"order_id": 2, "deliver_status": "delivered", "included_in_sales": True},
        {"order_id": 3, "deliver_status": "not_deliver", "included_in_sales": False},
        {"order_id": 4, "deliver_status": "delivered", "included_in_sales": True},
        {"order_id": 5, "deliver_status": "not_deliver", "included_in_sales": False},
    ])

    result = view_all_orders(repo)

    assert result["status"] == 200
    assert len(result["orders"]) == 5

# TC-11
def test_tc11_display_delivery_status_correctly():

    repo = FakeViewOrderRepo([
        {"order_id": 1, "deliver_status": "delivered", "included_in_sales": True},
        {"order_id": 2, "deliver_status": "not_deliver", "included_in_sales": False},
    ])

    result = view_all_orders(repo)

    assert result["status"] == 200

    assert result["orders"][0]["deliver_status"] == "delivered"
    assert result["orders"][1]["deliver_status"] == "not_deliver"

# TC-12
def test_tc12_undelivered_order_contributes_to_sales():

    repo = FakeViewOrderRepo([
        {
            "order_id": 1,
            "deliver_status": "not_deliver",
            "included_in_sales": True
        }
    ])

    with pytest.raises(OrderError) as err:
        view_all_orders(repo)

    assert err.value.status == 409
    assert "completion rules" in err.value.message.lower()