import pytest

from tests.fakes import FakeOrderRepo
from backend.services.test_order import (
    mark_order_delivered,
    OrderError
)

# TC-06
def test_tc06_mark_undelivered_order_as_delivered():
    repo = FakeOrderRepo()

    repo.add_order(
        order_id=1,
        status="not_deliver"
    )

    result = mark_order_delivered(repo, 1)

    assert result["status"] == 200
    assert repo.get_order(1)["deliver_status"] == "delivered"

# TC-07
def test_tc07_delivered_order_cannot_be_confirmed_twice():
    repo = FakeOrderRepo()

    repo.add_order(
        order_id=2,
        status="delivered"
    )

    with pytest.raises(OrderError) as err:
        mark_order_delivered(repo, 2)

    assert err.value.status == 409
    assert (
        "already confirmed"
        in err.value.message.lower()
    )

# TC-08
def test_tc08_delivered_order_updates_sales_and_customer_spending():
    repo = FakeOrderRepo()

    repo.add_order(
        order_id=3,
        status="not_deliver",
        total_amount=100000,
        customer_id=10
    )

    result = mark_order_delivered(repo, 3)

    assert result["status"] == 200

    assert result["sales_added"] == 100000
    assert result["customer_spending_added"] == 100000

# TC-09
def test_tc09_non_existing_order_is_rejected():
    repo = FakeOrderRepo()

    with pytest.raises(OrderError) as err:
        mark_order_delivered(repo, 999)

    assert err.value.status == 404
    assert "not found" in err.value.message.lower()