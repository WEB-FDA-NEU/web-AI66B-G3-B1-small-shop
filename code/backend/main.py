import sys
import os
from fastapi import FastAPI, HTTPException, status, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from schema.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from services.employee import add_employee, update_employee, get_all_employees, delete_employee, get_employee_by_id
from schema.order import OrderCreate, DeliveryResponse
from schema.customer import CustomerCreate, CustomerUpdate
from services.customer import search_customers, get_customers, get_customer_types, create_customer, update_customer, delete_customer
from services.order import get_products, create_order, get_orders, get_order_by_id, mark_order_delivered

from config.api import settings

app = FastAPI(title="YUMS")

# Configure CORS so browser fetch requests (POST, PUT, OPTIONS) are permitted
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from local HTML / frontend servers
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, PUT, DELETE, OPTIONS
    allow_headers=["*"],
)

emp_router = APIRouter(prefix="/employees", tags=["Employees"])

@emp_router.get(
    "",
    response_model=List[EmployeeResponse],
    summary="Get all employees",
)
def get_all_employees_endpoint():
    """Returns a list of all registered employees."""
    try:
        return get_all_employees()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch employees: {str(e)}",
        )

@emp_router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Get employee by ID",
)
def get_employee_by_id_endpoint(employee_id: int):
    """Retrieves a single employee record by ID."""
    employee = get_employee_by_id(employee_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )
    return employee
    
@emp_router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new employee",
)
def create_employee_endpoint(payload: EmployeeCreate):
    try:
        new_employee = add_employee(payload)
        return new_employee
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create employee: {str(e)}",
        )


@emp_router.put(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Update employee details",
)
def update_employee_endpoint(employee_id: int, payload: EmployeeUpdate):
    updated_employee = update_employee(employee_id, payload)
    if not updated_employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )
    return updated_employee

@emp_router.delete("/{employee_id}", status_code=status.HTTP_200_OK)
def delete_employee_endpoint(employee_id: int):
    return delete_employee(employee_id=employee_id)

app.include_router(emp_router)

#all routers for order screns of maitran
api_router = APIRouter(prefix="/api")

@api_router.get("/products", tags=["Products"])
def get_products_endpoint():
    return get_products()

@api_router.post("/orders", tags=["Orders"], status_code=status.HTTP_201_CREATED)
def create_order_endpoint(payload: OrderCreate):
    return create_order(payload)

@api_router.get("/orders", tags=["Orders"])
def get_orders_endpoint():
    return get_orders()

@api_router.get("/orders/{order_id}", tags=["Orders"])
def get_order_endpoint(order_id: int):
    order = get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order

@api_router.patch("/orders/{order_id}/deliver", response_model=DeliveryResponse, tags=["Orders"])
def deliver_order_endpoint(order_id: int):
    return mark_order_delivered(order_id)

#2 customer endpoints since maitran need them for the create ord screen
@api_router.get("/customers", tags=["Customers"])
def get_customers_endpoint():
    try:
        return get_customers()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Customer database is unavailable. Check the MySQL settings in backend/.env.",
        ) from e

@api_router.get("/customer-types", tags=["Customers"])
def get_customer_types_endpoint():
    try:
        return get_customer_types()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Customer database is unavailable. Check the MySQL settings in backend/.env.",
        ) from e

@api_router.get("/customers/search", tags=["Customers"])
def search_customers_endpoint(phone: str = ""):
    try:
        return search_customers(phone)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Customer database is unavailable. Check the MySQL settings in backend/.env.",
        ) from e

@api_router.post("/customers", tags=["Customers"], status_code=status.HTTP_201_CREATED)
def create_customer_endpoint(payload: CustomerCreate):
    return create_customer(payload)

@api_router.put("/customers/{customer_id}", tags=["Customers"])
def update_customer_endpoint(customer_id: int, payload: CustomerUpdate):
    return update_customer(customer_id, payload)

@api_router.delete("/customers/{customer_id}", tags=["Customers"], status_code=status.HTTP_204_NO_CONTENT)
def delete_customer_endpoint(customer_id: int):
    delete_customer(customer_id)

app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",  # Pass as string when reload=True
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD
    )