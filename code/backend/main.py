import os
import sys
import socket
import logging
from typing import List, Optional

from database.connect_db import get_connection
from fastapi import APIRouter, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Employee schemas and services
from schema.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from services.employee import (
    add_employee,
    update_employee,
    get_all_employees,
    delete_employee,
    get_employee_by_id,
    get_employee_by_username,
    get_employee_details,
)

# Authentication schemas and services
from schema.auth import ForgotPasswordRequest, LoginRequest
from schema.user import PasswordChange, UserCreate, UserResponse, UserUpdate
from backend.services.auth import (
    authenticate_user,
    change_password,
    require_authenticated_user,
    require_completed_user,
    require_user_manager,
)
from backend.services.users import (
    approve_password_reset,
    create_password_reset_request,
    create_user,
    delete_user,
    get_password_reset_requests,
    get_users,
    reset_user_password,
    update_user,
)

# Order schemas and services
from schema.order import OrderCreate, DeliveryResponse
from services.order import get_products, create_order, get_orders, get_order_by_id, mark_order_delivered
from backend.schema.order import OrderNoteUpdate
from backend.services.order import update_order_note

# Customer schemas and services
from schema.customer import CustomerCreate, CustomerUpdate
from services.customer import search_customers, get_customers, get_customer_details, get_customer_types, create_customer, update_customer, delete_customer

# Product schemas and services
from schema.product import ProductCreate, ProductUpdate, ProductResponse
from services.product import get_all_products, add_product, update_product, delete_product

# Inventory schemas and services
from schema.inventory import InventoryCreate, InventoryUpdate, InventoryResponse
from services.inventory import get_all_inventory, add_inventory, update_inventory, delete_inventory

# Sales schemas and services
from schema.sales import SalesItemOverview
from services.sales import get_sales_overview, get_demand_predictions

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

# Router declarations
emp_router = APIRouter(
    prefix="/employees",
    tags=["Employees"],
    dependencies=[Depends(require_completed_user)],
)
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
users_router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(require_completed_user)],
)
cus_router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
    dependencies=[Depends(require_completed_user)],
)
ord_router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
    dependencies=[Depends(require_completed_user)],
)
prod_router = APIRouter(
    prefix="/products",
    tags=["Products"],
    dependencies=[Depends(require_completed_user)],
)
inv_router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
    dependencies=[Depends(require_completed_user)],
)
cat_router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
    dependencies=[Depends(require_completed_user)],
)
sales_router = APIRouter(
    prefix="/sales",
    tags=["Sales"],
    dependencies=[Depends(require_user_manager)],
)
sales_test_router = APIRouter(
    prefix="/sales",
    tags=["Sales Test Alias"],
    dependencies=[Depends(require_user_manager)],
)

# Employee endpoints
@emp_router.get(
    "",
    response_model=List[EmployeeResponse],
    summary="Get all employees",
)
def get_all_employees_endpoint(_manager: dict = Depends(require_user_manager)):
    """Returns a list of all registered employees."""
    try:
        return get_all_employees()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch employees: {str(e)}",
        )

@emp_router.get(
    "/me/dashboard",
    summary="Get the signed-in employee's dashboard",
)
def get_employee_dashboard_endpoint(
    user: dict = Depends(require_completed_user),
):
    if user["role"] != "Employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This dashboard is only available to employees.",
        )

    try:
        employee = get_employee_by_username(user["username"])
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee profile not found.",
            )
        return get_employee_details(employee["employee_id"])
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Employee dashboard request failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Employee dashboard is unavailable. Check the database connection.",
        ) from error

@emp_router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Get employee by ID",
)
def get_employee_by_id_endpoint(
    employee_id: int,
    user: dict = Depends(require_completed_user),
):
    """Retrieves a single employee record by ID."""
    employee = get_employee_by_id(employee_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )
    if user["role"] not in {"Admin", "Manager"} and employee["username"] != user["username"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees can only view their own information.",
        )
    return employee

@emp_router.get(
    "/{employee_id}/details",
    summary="Get employee details and order history",
)
def get_employee_details_endpoint(
    employee_id: int,
    user: dict = Depends(require_completed_user),
):
    """Returns an employee profile, sales statistics, and recent orders."""
    try:
        if user["role"] not in {"Admin", "Manager"}:
            employee = get_employee_by_id(employee_id)
            if not employee:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Employee with ID {employee_id} not found.",
                )
            if employee["username"] != user["username"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Employees can only view their own information and KPIs.",
                )
        return get_employee_details(employee_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Employee details are unavailable. Check the database connection.",
        ) from e
    
@emp_router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new employee",
)
def create_employee_endpoint(
    payload: EmployeeCreate,
    _manager: dict = Depends(require_user_manager),
):
    try:
        new_employee = add_employee(payload)
        return new_employee
    except HTTPException:
        raise
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
def update_employee_endpoint(
    employee_id: int,
    payload: EmployeeUpdate,
    _manager: dict = Depends(require_user_manager),
):
    updated_employee = update_employee(employee_id, payload)
    if not updated_employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )
    return updated_employee

@emp_router.delete("/{employee_id}", status_code=status.HTTP_200_OK)
def delete_employee_endpoint(
    employee_id: int,
    _manager: dict = Depends(require_user_manager),
):
    return delete_employee(employee_id=employee_id)

# Authentication endpoints
@auth_router.post("/login", summary="Authenticate user and return token")
def login_endpoint(payload: LoginRequest):
    return authenticate_user(payload.username, payload.password)


@auth_router.post("/change-password", summary="Change the signed-in user's password")
def change_password_endpoint(
    payload: PasswordChange,
    user: dict = Depends(require_authenticated_user),
):
    change_password(user["user_id"], payload.new_password)
    return {"message": "Password changed successfully.", "must_change_password": False}


@auth_router.post("/forgot-password", summary="Request a manager password reset")
def forgot_password_endpoint(payload: ForgotPasswordRequest):
    create_password_reset_request(payload.username)
    return {
        "message": "If the account exists, a password reset request has been sent to a manager."
    }


@auth_router.get(
    "/password-reset-requests",
    summary="List pending password reset requests",
)
def list_password_reset_requests_endpoint(
    _manager: dict = Depends(require_user_manager),
):
    return get_password_reset_requests()


@auth_router.post(
    "/password-reset-requests/{user_id}/approve",
    summary="Approve a password reset request",
)
def approve_password_reset_endpoint(
    user_id: int,
    _manager: dict = Depends(require_user_manager),
):
    approve_password_reset(user_id)
    return {"message": "Password reset successfully. The user must change it after signing in."}


# User management endpoints
@users_router.get("", response_model=List[UserResponse])
def list_users_endpoint(_manager: dict = Depends(require_user_manager)):
    return get_users()

@users_router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(
    payload: UserCreate,
    _manager: dict = Depends(require_user_manager),
):
    return create_user(payload, _manager)

@users_router.put("/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: int,
    payload: UserUpdate,
    manager: dict = Depends(require_user_manager),
):
    return update_user(user_id, payload, manager)

@users_router.post("/{user_id}/reset-password")
def reset_user_password_endpoint(
    user_id: int,
    _manager: dict = Depends(require_user_manager),
):
    reset_user_password(user_id)
    return {"message": "Password reset successfully."}

@users_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_endpoint(
    user_id: int,
    manager: dict = Depends(require_user_manager),
):
    delete_user(user_id, manager)

# Order endpoints
@ord_router.post("", status_code=status.HTTP_201_CREATED)
def create_order_endpoint(payload: OrderCreate):
    return create_order(payload)

@ord_router.get("")
def get_orders_endpoint():
    return get_orders()

@ord_router.get("/{order_id}")
def get_order_endpoint(order_id: int):
    order = get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order

@ord_router.patch("/{order_id}/deliver", response_model=DeliveryResponse)
def deliver_order_endpoint(order_id: int):
    return mark_order_delivered(order_id)

@ord_router.patch("/{order_id}/note")
def update_order_note_route(
    order_id: int,
    data: OrderNoteUpdate
):
    return update_order_note(order_id, data)

# Customer endpoints
@cus_router.get("")
def get_customers_endpoint():
    try:
        return get_customers()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Customer database is unavailable. Check the MySQL settings in backend/.env.",
        ) from e

@cus_router.get("/customer-types")
def get_customer_types_endpoint():
    try:
        return get_customer_types()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Customer database is unavailable. Check the MySQL settings in backend/.env.",
        ) from e

@cus_router.get("/{customer_id}/details")
def get_customer_details_endpoint(customer_id: int):
    try:
        return get_customer_details(customer_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Customer database is unavailable. Check the MySQL settings in backend/.env.",
        ) from e

@cus_router.get("/search")
def search_customers_endpoint(phone: str = ""):
    try:
        return search_customers(phone)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Customer database is unavailable. Check the MySQL settings in backend/.env.",
        ) from e

@cus_router.post("", status_code=status.HTTP_201_CREATED)
def create_customer_endpoint(payload: CustomerCreate):
    return create_customer(payload)

@cus_router.put("/{customer_id}")
def update_customer_endpoint(customer_id: int, payload: CustomerUpdate):
    return update_customer(customer_id, payload)

@cus_router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer_endpoint(customer_id: int):
    delete_customer(customer_id)

# PRODUCT ENDPOINTS
@prod_router.get("", response_model=List[ProductResponse])
def get_all_products_endpoint():
    try:
        return get_all_products()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")

@prod_router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product_endpoint(payload: ProductCreate):
    try:
        return add_product(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create product: {str(e)}")

@prod_router.put("/{product_id}", response_model=ProductResponse)
def update_product_endpoint(product_id: int, payload: ProductUpdate):
    updated = update_product(product_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found.")
    return updated

@prod_router.delete("/{product_id}")
def delete_product_endpoint(product_id: int):
    success = delete_product(product_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found.")
    return {"message": f"Product {product_id} deleted successfully."}

# INVENTORY ENDPOINTS 
@inv_router.get("", response_model=List[InventoryResponse])
def get_all_inventory_endpoint():
    try:
        return get_all_inventory()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch inventory: {str(e)}")

@inv_router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_endpoint(payload: InventoryCreate):
    try:
        return add_inventory(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create item: {str(e)}")

@inv_router.put("/{sku}", response_model=InventoryResponse)
def update_inventory_endpoint(sku: str, payload: InventoryUpdate):
    updated = update_inventory(sku, payload)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Product SKU {sku} not found.")
    return updated

@inv_router.delete("/{sku}")
def delete_inventory_endpoint(sku: str):
    if not delete_inventory(sku):
        raise HTTPException(status_code=404, detail=f"Product SKU {sku} not found.")
    return {"message": f"Product {sku} deleted successfully."}

# CATEGORY ENDPOINTS 
@cat_router.get("")
def get_categories_endpoint():
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT category_id, category_name FROM categories")
            categories = cursor.fetchall()
            return categories if categories else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch categories: {str(e)}")
    finally:
        if conn and conn.open:
            conn.close()

# SALES ANALYTICS ENDPOINTS
@sales_router.get("/overview")
def get_sales_overview_endpoint(
    top_n: Optional[str] = Query("5"),
    category: Optional[str] = Query(None),
    timeframe: Optional[str] = Query("this_month")
):
    try:
        # Truyền đầy đủ top_n, category và timeframe vào service mới
        return get_sales_overview(top_n=top_n, category=category, timeframe=timeframe)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sales overview: {str(e)}")

@sales_router.get("/predictions")
def get_demand_predictions_endpoint(window_days: int = Query(30)):
    try:
        return get_demand_predictions(window_days=window_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate predictions: {str(e)}")

import logging
logger = logging.getLogger(__name__)

@app.get("/health")
def health():
    conn = None
    cursor = None

    try:
        logger.info("Health check: testing MySQL connection...")
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        if result is None:
            raise RuntimeError("MySQL SELECT 1 returned no result")
        logger.info("Health check: MySQL connection successful.")
        return {
            "status": "healthy",
            "database": "connected",
            "test_query": "passed"
        }
    except Exception as e:
        logger.exception("HEALTH CHECK DATABASE ERROR")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "database": "unavailable",
                "error_type": type(e).__name__,
                "error": str(e)
            }
        )
    finally:
        if cursor is not None:
            try:
                cursor.close()
            except Exception:
                logger.exception("Error closing MySQL cursor")
        if conn is not None:
            try:
                conn.close()
            except Exception:
                logger.exception("Error closing MySQL connection")


    
# Register all routers after their endpoint declarations
app.include_router(emp_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(cus_router)
app.include_router(ord_router)
app.include_router(prod_router)
app.include_router(inv_router)
app.include_router(cat_router)
app.include_router(sales_router)
app.include_router(sales_test_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",  
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD
    )