import sys
import os
from fastapi import FastAPI, HTTPException, status, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from schema.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from services.employee import add_employee, update_employee, get_all_employees, delete_employee, get_employee_by_id
from schema.auth import LoginRequest
from services.auth import authenticate_user
from schema.order import OrderCreate, DeliveryResponse
from schema.customer import CustomerCreate, CustomerUpdate
from services.customer import search_customers, get_customers, get_customer_details, get_customer_types, create_customer, update_customer, delete_customer
from schema.order import OrderCreate, DeliveryResponse
from services.order import get_products, create_order, get_orders, get_order_by_id, mark_order_delivered
from backend.schema.order import OrderNoteUpdate
from backend.services.order import update_order_note

from config.api import settings

app = FastAPI(title="YUMS")

#oanhtran
from schema.product import ProductCreate, ProductUpdate, ProductResponse
from services.product import get_all_products, add_product, update_product, delete_product


from schema.sales import SalesItemOverview, DemandPredictionResponse, SalesFilterQuery
from services.sales import get_sales_overview, get_demand_predictions
from fastapi import Query
from typing import Optional

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

@api_router.post("/login", tags=["Authentication"])
def login_endpoint(payload: LoginRequest):
    return authenticate_user(payload.username, payload.password)


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

@app.patch("/api/orders/{order_id}/note", tags=["Orders"])
def update_order_note_route(
    order_id: int,
    data: OrderNoteUpdate
):
    return update_order_note(order_id, data)

#customer endpoints since maitran need them for the create ord screen
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

@api_router.get("/customers/{customer_id}/details", tags=["Customers"])
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

# oanhtran: product endpoints
@app.get("/products", response_model=List[ProductResponse], summary="Get all products")
def get_all_products_endpoint():
    try:
        return get_all_products()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")

@app.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, summary="Add a new product")
def create_product_endpoint(payload: ProductCreate):
    try:
        return add_product(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create product: {str(e)}")

@app.put("/products/{product_id}", response_model=ProductResponse, summary="Update product details")
def update_product_endpoint(product_id: int, payload: ProductUpdate):
    updated = update_product(product_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found.")
    return updated

@app.delete("/products/{product_id}", summary="Delete a product")
def delete_product_endpoint(product_id: int):
    success = delete_product(product_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found.")
    return {"message": f"Product {product_id} deleted successfully."}


# oanhtran: sales endpoints and analytics

@app.get("/sales/overview", summary="Get sales overview (US11)")
def get_sales_overview_endpoint(
    top_n: Optional[str] = Query("5"),
    category: Optional[str] = Query(None),
    timeframe: Optional[str] = Query("monthly")
):
    try:
        from services.sales import get_sales_overview
        return get_sales_overview(top_n=top_n, category=category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sales overview: {str(e)}")

@app.get("/sales/predictions", summary="Get demand forecasting (US15, US16)")
def get_demand_predictions_endpoint(window_days: int = Query(30)):
    try:
        from services.sales import get_demand_predictions
        return get_demand_predictions(window_days=window_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate predictions: {str(e)}")

    
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",  # Pass as string when reload=True
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD
    )