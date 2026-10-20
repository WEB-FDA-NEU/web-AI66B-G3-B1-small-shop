const API_URL = "http://127.0.0.1:8000/employees";

let employees = [];
let isEditMode = false;

// DOM Elements
const tableBody = document.getElementById('employeeTableBody');
const searchInput = document.getElementById('searchInput');
const roleFilter = document.getElementById('roleFilter');

// Modal & Form Elements
const modal = document.getElementById('employeeModal');
const modalTitle = document.getElementById('modalTitle');
const employeeForm = document.getElementById('employeeForm');
const openModalBtn = document.getElementById('openAddModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const toast = document.getElementById('toastNotification');

// Form Input Elements
const employeeIdInput = document.getElementById('employeeId');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const roleInput = document.getElementById('role');
const statusInput = document.getElementById('status');

// Helper to get initials for avatar
function getInitials(name) {
  if (!name) return "NV";
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Format Date string safely (e.g., "2026-10-04" -> "04/10/2026")
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  
  const cleanDateStr = String(dateStr).split('T')[0];
  const parts = cleanDateStr.split('-');
  
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  
  return dateStr;
}



// Fetch employees from API
async function fetchEmployees() {
  showLoading();
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      const message = await getApiErrorMessage(response);
      showToast(message, "error");
      return;
    }
    employees = await response.json();
    filterData();
  } catch (error) {
    showNetworkError();
  } finally {
        hideLoading();
  }
}

// Delete Employee Handler
async function deleteEmployee(employeeId, employeeName) {
  const confirmDelete = confirm(`Are you sure you want to delete employee "${employeeName}" (NV-${String(employeeId).padStart(3, '0')})?`);
  if (!confirmDelete) return;

  try {
    const response = await fetch(`${API_URL}/${employeeId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const message = await getApiErrorMessage(response);
      showToast(message, "error");
      return;
    }
    let data = {};
    try {
      data = await response.json();
    } catch {
      // The response may not contain JSON.
    }
    showToast(data.message || 'Employee deleted successfully!');
    
    // Refresh employee table data
    fetchEmployees();
  } catch (error) {
    console.error('Delete Error:', error);
    showNetworkError();
  } finally {
        hideLoading();
  }
}

// Render Table Rows matching database schema
function renderTable(data) {
  tableBody.innerHTML = '';
  
  if (!data || data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No matching employees found.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(emp => {
    const tr = document.createElement('tr');
    const idDisplay = `NV-${String(emp.employee_id).padStart(3, '0')}`;
    const statusClassMap = {
    'Active': 'badge-active',
    'On Leave': 'badge-leave',
    'Inactive': 'badge-inactive'
    };
    const badgeClass = statusClassMap[emp.status] || 'badge-inactive';
    
    const safeName = (emp.name || '').replace(/'/g, "\\'");

    tr.innerHTML = `
      <td class="emp-id">${idDisplay}</td>
      <td>
        <div class="emp-name-cell">
          <div class="emp-avatar">${getInitials(emp.name)}</div>
          <div>
            <div style="font-weight: 500;">${emp.name}</div>
            <div style="font-size: 0.8rem; color: #777;">${emp.email || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td>${emp.role}</td>
      <td>${emp.phone || 'N/A'}</td>
      <td><span class="badge ${badgeClass}">${emp.status}</span></td>
      <td>${formatDate(emp.created_at)}</td>
      <td>
        <div class="action-buttons" style="justify-content: flex-end; display: flex; gap: 8px;">
          <button class="btn-icon" title="Edit Employee" onclick="openEditEmployeeModal(${emp.employee_id})">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon btn-delete" title="Delete Employee" onclick="deleteEmployee(${emp.employee_id}, '${safeName}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Search and Filter Logic
function filterData() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedRole = roleFilter ? roleFilter.value : '';

  const filtered = employees.filter(emp => {
    const empIdFormatted = `nv-${String(emp.employee_id).padStart(3, '0')}`;
    const matchesSearch = (emp.name && emp.name.toLowerCase().includes(searchTerm)) || 
                          empIdFormatted.includes(searchTerm);
    const matchesRole = selectedRole === "" || emp.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  renderTable(filtered);
}

// Open Modal in ADD Mode
function openAddEmployeeModal() {
  isEditMode = false;
  if (modalTitle) modalTitle.textContent = "Add New Employee";
  if (employeeForm) employeeForm.reset();
  if (employeeIdInput) employeeIdInput.value = '';
  modal.classList.add('active');
}

// Open Modal in EDIT Mode
function openEditEmployeeModal(id) {
  const emp = employees.find(e => e.employee_id === id);
  if (!emp) return;

  isEditMode = true;
  if (modalTitle) modalTitle.textContent = "Edit Employee";

  if (employeeIdInput) employeeIdInput.value = emp.employee_id;
  if (fullNameInput) fullNameInput.value = emp.name;
  if (emailInput) emailInput.value = emp.email || '';
  if (phoneInput) phoneInput.value = emp.phone || '';
  if (roleInput) roleInput.value = emp.role;
  if (statusInput) statusInput.value = emp.status;

  modal.classList.add('active');
}

// Close Modal
function closeModal() {
  modal.classList.remove('active');
  if (employeeForm) employeeForm.reset();
}

// Form Submit Handler (Handles both ADD and EDIT)
async function handleFormSubmit(e) {
  e.preventDefault();

  const payload = {
    name: fullNameInput.value.trim(),
    email: emailInput.value.trim() || null,
    phone: phoneInput.value.trim() || null,
    role: roleInput.value,
    status: statusInput.value
  };

  try {
    let response;
    
    if (isEditMode) {
      const id = employeeIdInput.value;
      response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) {
      const message = await getApiErrorMessage(response);
      showToast(message, "error");
      return;
    }

    showToast(isEditMode ? "Updated employee successfully!" : "Added new employee successfully!", "success");
    closeModal();
    fetchEmployees();

  } catch (error) {
    showNetworkError();;
  } finally {
        hideLoading();
  }
}

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

  // Initial data load
  fetchEmployees();
});

window.deleteEmployee = deleteEmployee;
window.openEditEmployeeModal = openEditEmployeeModal;