class OrderError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message


def create_order(repo, products):

    if len(products) == 0:
        raise OrderError(
            422,
            "Order must contain at least one product"
        )

    for product in products:

        if product["name"] in repo.expired_products:
            raise OrderError(
                409,
                "This product is expired and cannot be sold!"
            )

        if product["name"] in repo.unavailable_products:
            raise OrderError(
                409,
                "This product is insufficient at the moment!"
            )

    return {"status": 201}


def mark_order_delivered(repo, order_id):
    order = repo.get_order(order_id)
    # TC-09
    if order is None:
        raise OrderError(
            404,
            "Order not found."
        )

    # TC-07
    if order["deliver_status"] == "delivered":
        raise OrderError(
            409,
            "You already confirmed this order's delivery status!"
        )

    # TC-06 + TC-08
    order["deliver_status"] = "delivered"

    return {
        "status": 200,
        "sales_added": order["total_amount"],
        "customer_spending_added": order["total_amount"]
    }

def view_all_orders(repo):

    orders = repo.get_orders()

    # TC-12 - BR2 violation
    for order in orders:
        if (order["deliver_status"] == "not_deliver" and order["included_in_sales"] is True):
            raise OrderError(
                409,
                "Order violated completion rules!"
            )

    return {
        "status": 200,
        "orders": orders
    }