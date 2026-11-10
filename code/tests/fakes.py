#let's all use the fake data in this file

class FakeProductRepo:
    def __init__(
        self,
        available_products=None,
        expired_products=None,
        unavailable_products=None
    ):
        self.available_products = available_products or []
        self.expired_products = expired_products or []
        self.unavailable_products = unavailable_products or []
        self.orders = {}

    def add_order(self, order_id, status, total_amount=0, customer_id=None):
        self.orders[order_id] = {
            "order_id": order_id,
            "deliver_status": status,
            "total_amount": total_amount,
            "customer_id": customer_id
        }

    def get_order(self, order_id):
        return self.orders.get(order_id)

    def update_status(self, order_id, status):
        self.orders[order_id]["deliver_status"] = status


class FakeOrderRepo:

    def __init__(self):
        self.orders = {}

    def add_order(
        self,
        order_id,
        status,
        total_amount=0,
        customer_id=None
    ):
        self.orders[order_id] = {
            "order_id": order_id,
            "deliver_status": status,
            "total_amount": total_amount,
            "customer_id": customer_id
        }

    def get_order(self, order_id):
        return self.orders.get(order_id)

class FakeViewOrderRepo:
    def __init__(self, orders=None):
        self.orders = orders or []

    def get_orders(self):
        return self.orders