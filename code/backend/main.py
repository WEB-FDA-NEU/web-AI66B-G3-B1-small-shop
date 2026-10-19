import sys
import os
from fastapi import FastAPI, HTTPException, status, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from schema.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from services.employee import add_employee, update_employee, get_all_employees, delete_employee, get_employee_by_id
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

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",  # Pass as string when reload=True
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD
    )