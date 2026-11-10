from typing import List
from fastapi import APIRouter

from schema.customer import CustomerResponse
from services.customer import get_all_customers


customer_router = APIRouter(
    prefix="/customers",
    tags=["Customers"]
)


@customer_router.get(
    "",
    response_model=List[CustomerResponse],
    summary="Get all customers"
)
def get_all_customers_endpoint():
    """Returns all customers with their membership names."""
    return get_all_customers()