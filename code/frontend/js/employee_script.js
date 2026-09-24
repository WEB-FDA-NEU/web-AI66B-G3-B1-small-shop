
// Prototype Initial Sample Data
const initialEmployees = [
    { id: "NV-001", name: "Trần Minh Hoàng", role: "Quản lý", shift: "Full-time", phone: "0905 123 456", joinDate: "15/01/2024", status: "Đang làm" },
    { id: "NV-002", name: "Lê Thị Mai", role: "Thu ngân", shift: "Ca Sáng (07:00 - 15:00)", phone: "0914 987 654", joinDate: "01/03/2024", status: "Đang làm" },
    { id: "NV-003", name: "Nguyễn Quốc Bảo", role: "Pha chế", shift: "Ca Chiều (15:00 - 23:00)", phone: "0932 555 789", joinDate: "10/05/2024", status: "Nghỉ phép" },
    { id: "NV-004", name: "Phạm Thảo Nhi", role: "Phục vụ", shift: "Ca Sáng (07:00 - 15:00)", phone: "0988 112 233", joinDate: "20/06/2024", status: "Đang làm" },
    { id: "NV-005", name: "Đỗ Anh Tuấn", role: "Pha chế", shift: "Ca Sáng (07:00 - 15:00)", phone: "0977 445 566", joinDate: "12/08/2024", status: "Đang làm" }
];

let employees = [...initialEmployees];

// DOM Elements
const tableBody = document.getElementById('employeeTableBody');
const searchInput = document.getElementById('searchInput');
const roleFilter = document.getElementById('roleFilter');
const modal = document.getElementById('employeeModal');
const openModalBtn = document.getElementById('openAddModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveEmployeeBtn = document.getElementById('saveEmployeeBtn');
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
                    Không tìm thấy nhân viên nào phù hợp.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(emp => {
        const tr = document.createElement('tr');
        const badgeClass = emp.status === 'Đang làm' ? 'badge-active' : 'badge-leave';
        
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
                    <button class="btn-icon" title="Chỉnh sửa" onclick="editEmployee('${emp.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon delete" title="Xóa" onclick="deleteEmployee('${emp.id}')">
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
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedRole = roleFilter.value;

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
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Modal Controls
function openModal() {
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    document.getElementById('employeeForm').reset();
}

// Add Employee Handler
function handleSaveEmployee(e) {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const role = document.getElementById('role').value;
    const shift = document.getElementById('shift').value;
    const phone = document.getElementById('phone').value.trim();
    const status = document.getElementById('status').value;

    if (!fullName || !phone) {
        showToast("Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }

    const newId = `NV-00${employees.length + 1}`;
    const today = new Date().toLocaleDateString('vi-VN');

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
    filterData();
    closeModal();
    showToast(`Đã thêm thành công nhân viên ${fullName}`);
}

// Prototype Delete Handler
window.deleteEmployee = function(id) {
    const emp = employees.find(e => e.id === id);
    if (emp) {
        employees = employees.filter(e => e.id !== id);
        filterData();
        showToast(`Đã xóa thông tin nhân viên ${emp.name}`);
    }
};

// Prototype Edit Handler
window.editEmployee = function(id) {
    const emp = employees.find(e => e.id === id);
    if (emp) {
        showToast(`Prototype: Mở form chỉnh sửa cho ${emp.name}`);
    }
};

// Event Listeners
searchInput.addEventListener('input', filterData);
roleFilter.addEventListener('change', filterData);
openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
saveEmployeeBtn.addEventListener('click', handleSaveEmployee);

// Initial Render
renderTable(employees);
