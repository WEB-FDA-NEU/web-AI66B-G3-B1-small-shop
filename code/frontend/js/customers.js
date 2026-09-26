// Prototype Initial Sample Data
const initialCustomers = [
  { id: "NV-001", name: "Trần Minh Hoàng", email: "123@gmail.com", shift: "Full-time", phone: "0905 123 456", joinDate: "15/01/2024", status: "Active" },
  { id: "NV-002", name: "Lê Thị Mai", email: "345@gmail.com", shift: "Morning Shift (07:00 - 15:00)", phone: "0914 987 654", joinDate: "01/03/2024", status: "Active" },
  { id: "NV-003", name: "Nguyễn Quốc Bảo", email: "678@gmail.com", shift: "Evening Shift (15:00 - 23:00)", phone: "0932 555 789", joinDate: "10/05/2024", status: "On Leave" },
  { id: "NV-004", name: "Phạm Thảo Nhi", email: "91011@gmail.com", shift: "Morning Shift (07:00 - 15:00)", phone: "0988 112 233", joinDate: "20/06/2024", status: "Active" },
  { id: "NV-005", name: "Đỗ Anh Tuấn", email: "121314@gmail.com", shift: "Morning Shift (07:00 - 15:00)", phone: "0977 445 566", joinDate: "12/08/2024", status: "Active" }
];

let employees = [...initialEmployees];
let isEditMode = false;
let currentEditId = null;

// DOM Elements
const tableBody = document.getElementById('customersTableBody');
const searchInput = document.getElementById('searchInput');
const roleFilter = document.getElementById('roleFilter');

// Modal & Form Elements
const modal = document.getElementById('employeeModal'); // Single shared modal
const modalTitle = document.getElementById('modalTitle'); // Heading inside modal
const employeeForm = document.getElementById('employeeForm');
const openModalBtn = document.getElementById('openAddModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const toast = document.getElementById('toastNotification');

// Helper to get initials for avatar
function getInitials(name) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Render Table Rows
function renderTable(data) {
  tableBody.innerHTML = '';
  if (data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No matching employees found.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(emp => {
    const tr = document.createElement('tr');
    const badgeClass = emp.status === 'Active' ? 'badge-active' : 'badge-leave';
    
    tr.innerHTML = `
      <td class="emp-id">${emp.id}</td>
      <td>
        <div class="emp-name-cell">
          <div class="emp-avatar">${getInitials(emp.name)}</div>
          <span style="font-weight: 500;">${emp.name}</span>
        </div>
      </td>
      <td>${emp.role}</td>
      <td>${emp.shift}</td>
      <td>${emp.phone}</td>
      <td>${emp.joinDate}</td>
      <td><span class="badge ${badgeClass}">${emp.status}</span></td>
      <td>
        <div class="action-buttons" style="justify-content: flex-end;">
          <button class="btn-icon" title="Edit Employee" onclick="openEditEmployeeModal('${emp.id}')">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon delete" title="Delete Employee" onclick="deleteEmployee('${emp.id}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Filter and Search Logic
function filterData() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedRole = roleFilter ? roleFilter.value : '';

  const filtered = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm) || 
                          emp.id.toLowerCase().includes(searchTerm);
    const matchesRole = selectedRole === "" || emp.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  renderTable(filtered);
}

// Show Toast Notification
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Open Modal in ADD Mode
function openAddEmployeeModal() {
  isEditMode = false;
  currentEditId = null;
  
  if (modalTitle) modalTitle.textContent = "Add New Employee";
  if (employeeForm) employeeForm.reset();
  
  modal.classList.add('active');
}

// Open Modal in EDIT Mode
window.openEditEmployeeModal = function(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;

  isEditMode = true;
  currentEditId = id;

  if (modalTitle) modalTitle.textContent = "Edit Employee";

  // Fill form fields with employee data
  if (document.getElementById('fullName')) document.getElementById('fullName').value = emp.name;
  if (document.getElementById('role')) document.getElementById('role').value = emp.role;
  if (document.getElementById('shift')) document.getElementById('shift').value = emp.shift;
  if (document.getElementById('phone')) document.getElementById('phone').value = emp.phone;
  if (document.getElementById('status')) document.getElementById('status').value = emp.status;

  modal.classList.add('active');
};

// Close Modal
function closeModal() {
  modal.classList.remove('active');
  if (employeeForm) employeeForm.reset();
}

// Form Submit Handler (Handles both ADD and EDIT)
function handleFormSubmit(e) {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const role = document.getElementById('role').value;
  const shift = document.getElementById('shift').value;
  const phone = document.getElementById('phone').value.trim();
  const status = document.getElementById('status') ? document.getElementById('status').value : 'Active';

  if (!fullName || !phone) {
    showToast("Please complete all required fields!");
    return;
  }

  if (isEditMode) {
    // EDIT LOGIC
    const index = employees.findIndex(e => e.id === currentEditId);
    if (index !== -1) {
      employees[index].name = fullName;
      employees[index].role = role;
      employees[index].shift = shift;
      employees[index].phone = phone;
      employees[index].status = status;

      showToast(`Updated employee ${fullName} successfully`);
    }
  } else {
    // ADD LOGIC
    const newId = `NV-00${employees.length + 1}`;
    const today = new Date().toLocaleDateString('en-GB');

    const newEmp = {
      id: newId,
      name: fullName,
      role: role,
      shift: shift,
      phone: phone,
      joinDate: today,
      status: status
    };

    employees.unshift(newEmp);
    showToast(`Added new employee ${fullName} successfully`);
  }

  filterData();
  closeModal();
}

// Delete Employee Handler
window.deleteEmployee = function(id) {
  const emp = employees.find(e => e.id === id);
  if (emp) {
    employees = employees.filter(e => e.id !== id);
    filterData();
    showToast(`Deleted employee ${emp.name}`);
  }
};

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  if (searchInput) searchInput.addEventListener('input', filterData);
  if (roleFilter) roleFilter.addEventListener('change', filterData);

  if (openModalBtn) openModalBtn.addEventListener('click', openAddEmployeeModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
  
  if (employeeForm) employeeForm.addEventListener('submit', handleFormSubmit);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Initial render
  renderTable(customers);
});