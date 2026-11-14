import os
import sys
from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import pymysql
from typing import List, Dict, Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database.connect_db import get_connection
from backend.schema.employee import EmployeeCreate, EmployeeUpdate

def get_all_employees() -> List[Dict[str, Any]]:
    """Retrieves all employee records from the database ordered by ID descending."""
    connection = get_connection()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed."
        )
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM employees ORDER BY employee_id DESC;")
            employees = cursor.fetchall()
            return employees if employees else []
    finally:
        connection.close()

def add_employee(employee_data: EmployeeCreate) -> Dict[str, Any]:
    """Inserts a new employee if the username is not already assigned."""
    connection = get_connection()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed."
        )
    
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT employee_id FROM employees WHERE username = %s LIMIT 1;",
                (employee_data.username,)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username is already assigned to an employee."
                )

            insert_query = """
                INSERT INTO employees (name, username, phone, role, status)
                VALUES (%s, %s, %s, %s, %s);
            """
            cursor.execute(
                insert_query,
                (
                    employee_data.name,
                    employee_data.username,
                    employee_data.phone,
                    employee_data.role,
                    employee_data.status,
                ),
            )
            connection.commit()
            employee_id = cursor.lastrowid

            cursor.execute("SELECT * FROM employees WHERE employee_id = %s;", (employee_id,))
            new_employee = cursor.fetchone()
            return new_employee
    except pymysql.err.IntegrityError as exc:
        if exc.args and exc.args[0] == 1452:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username not found, please enter correct username or add a new user before creating an employee."
            ) from exc
        raise
    finally:
        connection.close()


def update_employee(employee_id: int, employee_data: EmployeeUpdate) -> Optional[Dict[str, Any]]:
    """Updates non-null fields of an existing employee and returns the updated record."""
    # Exclude unset fields from the payload
    update_data = employee_data.model_dump(exclude_unset=True)
    if not update_data:
        # Return current state if nothing was passed
        return get_employee_by_id(employee_id)

    # Build SET clause dynamically (e.g. "full_name = %s, salary = %s")
    set_clause = ", ".join([f"`{key}` = %s" for key in update_data.keys()])
    values = list(update_data.values())
    values.append(employee_id)

    connection = get_connection()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed."
        )
    
    try:
        with connection.cursor() as cursor:
            username = update_data.get("username")
            if username is not None:
                cursor.execute(
                    """
                    SELECT employee_id FROM employees
                    WHERE username = %s AND employee_id != %s
                    LIMIT 1;
                    """,
                    (username, employee_id)
                )
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Username is already assigned to another employee."
                    )

            query = f"UPDATE employees SET {set_clause} WHERE employee_id = %s;"
            cursor.execute(query, values)

            if cursor.rowcount == 0:
                # Check if employee exists
                cursor.execute("SELECT 1 FROM employees WHERE employee_id = %s;", (employee_id,))
                if not cursor.fetchone():
                    return None

            cursor.execute("SELECT * FROM employees WHERE employee_id = %s;", (employee_id,))
            return cursor.fetchone()
    except pymysql.err.IntegrityError as exc:
        if exc.args and exc.args[0] == 1452:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username not found, please enter correct username or add a new user before creating an employee."
            ) from exc
        raise
    finally:
        connection.close()


def get_employee_by_id(employee_id: int) -> Optional[Dict[str, Any]]:
    """Helper to fetch an employee by ID."""
    connection = get_connection()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed."
        )
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM employees WHERE employee_id = %s;", (employee_id,))
            return cursor.fetchone()
    finally:
        connection.close()

def get_employee_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Fetch the employee record linked to an authenticated username."""
    connection = get_connection()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed."
        )

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM employees WHERE BINARY username = BINARY %s LIMIT 1;",
                (username,),
            )
            return cursor.fetchone()
    finally:
        connection.close()


def get_employee_details(employee_id: int) -> Dict[str, Any]:
    """Fetch an employee profile, order totals, and recent orders."""
    connection = get_connection()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed."
        )

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT employee_id, name, username, phone, role, status, created_at,
                       GREATEST(DATEDIFF(CURRENT_DATE, created_at) + 1, 0) AS days_worked
                FROM employees
                WHERE employee_id = %s
            """, (employee_id,))
            employee = cursor.fetchone()
            if not employee:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Employee with ID {employee_id} not found."
                )

            cursor.execute("""
                SELECT COUNT(*) AS total_orders,
                       COALESCE(SUM(total_amount), 0) AS total_sales
                FROM orders
                WHERE employee_id = %s
            """, (employee_id,))
            stats = cursor.fetchone()

            cursor.execute("""
                SELECT DATE_FORMAT(o.created_at, '%%Y-%%m') AS month,
                       COUNT(*) AS order_count,
                       COALESCE(SUM(o.total_amount), 0) AS revenue
                FROM orders o
                WHERE o.employee_id = %s
                  AND o.created_at >= DATE_FORMAT(
                      DATE_SUB(CURRENT_DATE, INTERVAL 5 MONTH),
                      '%%Y-%%m-01'
                  )
                GROUP BY DATE_FORMAT(o.created_at, '%%Y-%%m')
                ORDER BY month
            """, (employee_id,))
            monthly_sales = cursor.fetchall()

            cursor.execute("""
                SELECT o.order_id, o.created_at, o.deliver_status,
                       o.total_amount, c.name AS customer_name,
                       COALESCE(
                           GROUP_CONCAT(
                               CONCAT(p.name, ' × ', oi.quantity)
                               ORDER BY oi.order_item_id SEPARATOR ', '
                           ),
                           '—'
                       ) AS items
                FROM orders o
                LEFT JOIN customers c ON c.customer_id = o.customer_id
                LEFT JOIN order_items oi ON oi.order_id = o.order_id
                LEFT JOIN products p ON p.product_id = oi.product_id
                WHERE o.employee_id = %s
                GROUP BY o.order_id, o.created_at, o.deliver_status,
                         o.total_amount, c.name
                ORDER BY o.created_at DESC, o.order_id DESC
                LIMIT 10
            """, (employee_id,))
            recent_orders = cursor.fetchall()

            return {
                "employee": employee,
                "stats": stats,
                "monthly_sales": monthly_sales,
                "recent_orders": recent_orders
            }
    finally:
        connection.close()


def delete_employee(employee_id: int) -> Dict[str, str]:
    """Deletes an employee record from the database by ID."""
    connection = get_connection()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed."
        )

    try:
        cursor = connection.cursor()

        # 1. Verify the employee exists before attempting deletion
        cursor.execute("SELECT employee_id FROM employees WHERE employee_id = %s;", (employee_id,))
        existing_employee = cursor.fetchone()

        if not existing_employee:
            cursor.close()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with ID {employee_id} not found."
            )

        # 2. Perform deletion
        delete_query = "DELETE FROM employees WHERE employee_id = %s;"
        cursor.execute(delete_query, (employee_id,))
        connection.commit()
        cursor.close()

        return {"message": f"Employee with ID {employee_id} deleted successfully."}

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        # Catch foreign key constraint failures (e.g., if employee is referenced in orders/users)
        if "foreign key constraint" in str(e).lower() or "1451" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete employee because they are linked to active orders or user accounts."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete employee: {str(e)}"
        )
    finally:
        connection.close()