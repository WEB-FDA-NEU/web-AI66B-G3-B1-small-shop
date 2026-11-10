import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "backend"))
sys.path.insert(0, BACKEND_DIR)

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

# US11: SALES ANALYTICS 

def test_tc_us11_01_get_sales_overview_normal():
    """TC-US11-01: Normal case - Get Top 5 Beverage items"""
    response = client.get("/sales/overview?top_n=5&category=Beverage")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 5

def test_tc_us11_02_invalid_top_n_format():
    """TC-US11-02: Error case - Invalid parameter type for top_n"""
    response = client.get("/sales/overview?top_n=invalid_text")
    assert response.status_code in [400, 422, 500]

def test_tc_us11_03_top_n_boundary_limit_one():
    """TC-US11-03: Boundary case - Top N = 1 (Lower valid bound)"""
    response = client.get("/sales/overview?top_n=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

def test_tc_us11_04_top_n_boundary_below_zero():
    """TC-US11-04: Boundary case - Top N = 0 (Below valid bound)"""
    response = client.get("/sales/overview?top_n=0")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


# US15: DEMAND FORECASTING

def test_tc_us15_01_demand_prediction_30_days():
    """TC-US15-01: Normal case - Forecasting for 30 days"""
    response = client.get("/sales/predictions?window_days=30")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

def test_tc_us15_02_invalid_window_days():
    """TC-US15-02: Edge case - Forecasting with custom window (e.g. 45 days)"""
    response = client.get("/sales/predictions?window_days=45")
    assert response.status_code == 200

def test_tc_us15_03_window_days_7_lower_bound():
    """TC-US15-03: Boundary case - Exactly 7 days window"""
    response = client.get("/sales/predictions?window_days=7")
    assert response.status_code == 200

def test_tc_us15_04_window_days_6_below_bound():
    """TC-US15-04: Edge case - Forecasting with small window (e.g. 6 days)"""
    response = client.get("/sales/predictions?window_days=6")
    assert response.status_code == 200

# US16: RESTOCK RECOMMENDATION

def test_tc_us16_01_restock_calculation_normal():
    """TC-US16-01: Normal case - Check restock logic for items"""
    response = client.get("/sales/predictions?window_days=30")
    assert response.status_code == 200
    data = response.json()
    for item in data:
        assert "suggested_restock" in item
        assert item["suggested_restock"] >= 0

def test_tc_us16_02_critical_deficit_boundary():
    """TC-US16-02: Boundary case - Stock <= 5 triggers Critical Deficit"""
    response = client.get("/sales/predictions?window_days=30")
    data = response.json()
    critical_items = [item for item in data if item["current_stock"] <= 5]
    for item in critical_items:
        assert "Critical Deficit" in item["status_badge"]

def test_tc_us16_03_low_stock_boundary_on_limit():
    """TC-US16-03: Boundary case - Stock > 5 and needs restock"""
    response = client.get("/sales/predictions?window_days=30")
    data = response.json()
    restock_items = [item for item in data if item["current_stock"] > 5 and item["suggested_restock"] > 0]
    for item in restock_items:
        assert "Restock Needed" in item["status_badge"]