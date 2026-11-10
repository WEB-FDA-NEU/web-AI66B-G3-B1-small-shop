from tests.fakes import FakeProductRepo
from backend.services.test_order import create_order
from backend.services.test_order import OrderError
import pytest

# TC-01
def test_tc01_create_order_with_one_valid_product():
    repo = FakeProductRepo(
        available_products=["Latte"]
    )
    result = create_order(
        repo,
        [
            {"name": "Latte", "quantity": 1}
        ]
    )
    assert result["status"] == 201

# TC-02
def test_tc02_create_order_with_multiple_products():
    repo = FakeProductRepo(
        available_products=[
            "Latte",
            "Tiramisu",
            "Americano"
        ]
    )
    result = create_order(
        repo,
        [
            {"name": "Latte", "quantity": 1},
            {"name": "Tiramisu", "quantity": 2},
            {"name": "Americano", "quantity": 3},
        ]
    )
    assert result["status"] == 201


# TC-03
def test_tc03_empty_order_is_rejected():
    repo = FakeProductRepo()

    with pytest.raises(OrderError) as err:
        create_order(repo, [])

    assert err.value.status == 422
    assert "at least one product" in err.value.message

# TC-04
def test_tc04_expired_product_is_rejected():
    repo = FakeProductRepo(
        expired_products=["Latte"]
    )

    with pytest.raises(OrderError) as err:
        create_order(
            repo,
            [
                {"name": "Latte", "quantity": 1}
            ]
        )

    assert err.value.status == 409
    assert "expired" in err.value.message.lower()

# TC-05
def test_tc05_unavailable_product_is_rejected():
    repo = FakeProductRepo(
        unavailable_products=["Latte"]
    )

    with pytest.raises(OrderError) as err:
        create_order(
            repo,
            [
                {"name": "Latte", "quantity": 1}
            ]
        )

    assert err.value.status == 409
    assert "insufficient" in err.value.message.lower()