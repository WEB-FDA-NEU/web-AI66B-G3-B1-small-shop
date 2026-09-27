// ========================================
// INITIAL CUSTOMER DATA
// ========================================

const initialCustomers = [
  {
    id: "KH-001",
    name: "Trần Minh Hoàng",
    email: "123@gmail.com",
    phone: "0905 123 456",
    totalSpending: 1250000,
    discount: "10%",
    membership: "Gold",
    status: "Active"
  },
  {
    id: "KH-002",
    name: "Lê Thị Mai",
    email: "345@gmail.com",
    phone: "0914 987 654",
    totalSpending: 850000,
    discount: "5%",
    membership: "Silver",
    status: "Active"
  }
];

let customers = [...initialCustomers];


// ========================================
// DOM ELEMENTS
// ========================================

const tableBody = document.getElementById("customersTableBody");
const searchInput = document.getElementById("searchInput");
const openAddCustomerBtn = document.getElementById("openAddModalBtn");


// ========================================
// RENDER CUSTOMER TABLE
// ========================================

function renderTable(data) {

  tableBody.innerHTML = "";

  if (data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 30px;">
          No matching customers found.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(customer => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${customer.id}</td>

      <td>
        <div class="customer-name-cell">
          <span>${customer.name}</span>
        </div>
      </td>

      <td>${customer.email}</td>

      <td>${customer.phone}</td>

      <td>${customer.totalSpending.toLocaleString()} VND</td>

      <td>${customer.discount}</td>

      <td>${customer.membership}</td>

      <td>
        <span class="badge badge-active">
          ${customer.status}
        </span>
      </td>

      <td>
        <div class="action-buttons">

          <button
            class="btn-icon"
            title="View Details"
            onclick="viewCustomer('${customer.id}')">
            <i class="fa-solid fa-eye"></i>
          </button>

          <button
            class="btn-icon delete"
            title="Delete Customer"
            onclick="deleteCustomer('${customer.id}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>

        </div>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}


// ========================================
// SEARCH
// ========================================

function filterData() {

  const searchTerm = searchInput
    ? searchInput.value.toLowerCase().trim()
    : "";

  const filtered = customers.filter(customer => {

    return (
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.id.toLowerCase().includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm) ||
      customer.phone.toLowerCase().includes(searchTerm)
    );

  });

  renderTable(filtered);
}


// ========================================
// ADD CUSTOMER → NEW PAGE
// ========================================

if (openAddCustomerBtn) {

  openAddCustomerBtn.addEventListener("click", () => {

    window.location.href = "customers_add.html";

  });

}


// ========================================
// VIEW CUSTOMER
// ========================================

window.viewCustomer = function(id) {

  window.location.href = `customers_detail.html?id=${id}`;

};


// ========================================
// DELETE CUSTOMER
// ========================================

window.deleteCustomer = function(id) {

  const customer = customers.find(
    customer => customer.id === id
  );

  if (!customer) return;

  const confirmed = confirm(
    `Are you sure you want to delete ${customer.name}?`
  );

  if (!confirmed) return;

  customers = customers.filter(
    customer => customer.id !== id
  );

  filterData();
};


// ========================================
// EVENT LISTENERS
// ========================================

document.addEventListener("DOMContentLoaded", () => {

  if (searchInput) {
    searchInput.addEventListener("input", filterData);
  }

  renderTable(customers);

});