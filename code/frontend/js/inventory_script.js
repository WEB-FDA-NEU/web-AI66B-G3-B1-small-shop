const API_URL = "http://127.0.0.1:8000/inventory";
const CATEGORIES_URL = "http://127.0.0.1:8000/categories";

// Mỗi phần tử = MỘT lô nhập kho (một dòng trong bảng inventory), không gộp theo sản phẩm
let records = [];
let isEditMode = false;

// 5 trạng thái (khớp với backend và database)
const PRODUCT_STATUSES = ["Available", "Low Stock", "Near Expiration", "Expired", "Sold out"];
const STATUS_BADGE_CLASS = {
  "Available": "badge-instock",
  "Low Stock": "badge-lowstock",
  "Near Expiration": "badge-nearexp",
  "Expired": "badge-expired",
  "Sold out": "badge-soldout"
};

// DOM Elements
const tableBody = document.getElementById('inventoryTableBody');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');

// Modal & Form Elements
const modal = document.getElementById('productModal');
const modalTitle = document.getElementById('modalTitle');
const productForm = document.getElementById('productForm');
const openModalBtn = document.getElementById('openAddModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const toast = document.getElementById('toastNotification');
const isEmployee = window.currentUser?.role === 'Employee';
const deleteInventoryModal = document.getElementById('deleteInventoryModal');
const deleteInventoryCode = document.getElementById('deleteInventoryCode');
const confirmDeleteInventoryBtn = document.getElementById('confirmDeleteInventoryBtn');
const cancelDeleteInventoryBtn = document.getElementById('cancelDeleteInventoryBtn');
let pendingDeleteCode = null;
let deleteTrigger = null;

// Hidden input lưu mã lô (inventory code) đang sửa
const inventoryIdInput = document.createElement('input');
inventoryIdInput.type = 'hidden';
inventoryIdInput.id = 'inventoryId';
if (productForm) productForm.appendChild(inventoryIdInput);

const productNameInput = document.getElementById('productName');
const categoryInput = document.getElementById('category');
const priceInput = document.getElementById('price');
const stockInput = document.getElementById('stock');

// ---------- Helpers ----------
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : '—';
}

function getInventoryCode(item) {
  return item.inventory_code || `INV-${String(item.inventory_id).padStart(3, '0')}`;
}

function getProductCode(item) {
  return item.product_code || `P-${String(item.product_id).padStart(3, '0')}`;
}

function getStockQty(item) {
  return item.stock_quantity !== undefined ? item.stock_quantity : (item.quantity || 0);
}

// Dùng khi backend không trả về status
function getFallbackStatus(item) {
  const qty = getStockQty(item);
  if (qty === 0) return "Sold out";
  if (item.expiry_date && String(item.expiry_date).slice(0, 10) < new Date().toISOString().slice(0, 10)) return "Expired";
  if (qty <= 5) return "Low Stock";
  return "Available";
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Tạo lại các lựa chọn của bộ lọc status theo 5 trạng thái
function populateStatusFilter() {
  if (!statusFilter) return;
  const current = statusFilter.value;
  statusFilter.innerHTML = '<option value="">All Statuses</option>' +
    PRODUCT_STATUSES.map(st => `<option value="${st}">${st}</option>`).join('');
  statusFilter.value = PRODUCT_STATUSES.includes(current) ? current : '';
}

// Nạp danh mục từ API: form dùng category_id làm value, bộ lọc dùng tên
async function loadCategories() {
  try {
    const response = await fetch(CATEGORIES_URL);
    if (!response.ok) throw new Error("Failed to load categories");
    const categories = await response.json();
    if (!Array.isArray(categories) || categories.length === 0) return;

    if (categoryInput && categories.every(c => c.category_id !== undefined)) {
      categoryInput.innerHTML = '<option value="">-- Select Category --</option>' +
        categories.map(c => `<option value="${c.category_id}">${escapeHtml(c.category_name)}</option>`).join('');
    }
    if (categoryFilter) {
      const current = categoryFilter.value;
      categoryFilter.innerHTML = '<option value="">All Categories</option>' +
        categories.map(c => `<option value="${escapeHtml(c.category_name)}">${escapeHtml(c.category_name)}</option>`).join('');
      categoryFilter.value = current;
    }
  } catch (error) {
    console.error("Error loading categories:", error.message);
  }
}

// ---------- Data ----------
async function fetchInventory() {
  showTableLoading?.(tableBody, 9, "Loading inventory...");
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Failed to load inventory from server.");

    records = await response.json();

    // Lịch sử nhập kho: mới nhập nhất xếp trước
    records.sort((a, b) => {
      const dateA = String(a.import_date || '');
      const dateB = String(b.import_date || '');
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.inventory_id || 0) - (a.inventory_id || 0);
    });

    filterData();
  } catch (error) {
    console.error("Server Error Details:", error.message);
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: #b42318; padding: 30px;">
            Unable to load inventory. Please try again.
          </td>
        </tr>
      `;
    }
    showToast("Something went wrong on the server. Please try again later.");
  }
}

// ---------- Render ----------
function renderTable(data) {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (!data || data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No matching records found in inventory.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement('tr');
    const invCode = getInventoryCode(item);
    const displayCategory = item.category_name || item.category || 'General';
    const stockQty = getStockQty(item);
    const statusText = item.status || getFallbackStatus(item);
    const badgeClass = item.badge_class || STATUS_BADGE_CLASS[statusText] || "badge-instock";

    tr.innerHTML = `
      <td class="item-sku" data-label="Inventory ID">${escapeHtml(invCode)}</td>
      <td data-label="Product Name" style="font-weight: 600; color: var(--bg-sidebar);">${escapeHtml(item.product_name || item.name)}</td>
      <td data-label="Category"><span class="badge" style="background: #EAECEE; color: #2C3E50;">${escapeHtml(displayCategory)}</span></td>
      <td data-label="Unit Price">${formatVND(item.unit_price)}</td>
      <td data-label="Stock Qty" style="font-weight: 600;">${stockQty}</td>
      <td data-label="Import Date">${formatDate(item.import_date)}</td>
      <td data-label="Expiry Date">${formatDate(item.expiry_date)}</td>
      <td data-label="Status"><span class="badge ${badgeClass}">${statusText}</span></td>
      ${isEmployee ? '' : `
        <td data-label="Actions">
          <div class="action-buttons" style="justify-content: flex-end;">
            <button class="btn-icon" title="Edit Product" onclick="openEditProductModal('${invCode}')">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-icon delete" title="Delete Product" onclick="deleteProduct('${invCode}', this)">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `}
    `;
    tableBody.appendChild(tr);
  });
}

// ---------- Filter & Search ----------
function filterData() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedCategory = categoryFilter ? categoryFilter.value : '';
  const selectedStatus = statusFilter ? statusFilter.value : '';

  const filtered = records.filter(item => {
    const invCode = getInventoryCode(item).toLowerCase();
    const productCode = getProductCode(item).toLowerCase();
    const productName = (item.product_name || item.name || '').toLowerCase();
    const itemStatus = item.status || getFallbackStatus(item);

    const matchesSearch = productName.includes(searchTerm) || invCode.includes(searchTerm) || productCode.includes(searchTerm);
    const matchesCategory = selectedCategory === "" || (item.category_name || item.category) === selectedCategory;
    const matchesStatus = selectedStatus === "" || itemStatus === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  renderTable(filtered);
}

// ---------- Modal ----------
function openAddProductModal() {
  isEditMode = false;
  if (modalTitle) modalTitle.textContent = "Add New Product";
  if (productForm) productForm.reset();
  if (inventoryIdInput) inventoryIdInput.value = '';
  modal.classList.add('active');
}

window.openEditProductModal = function(invCode) {
  const item = records.find(r => getInventoryCode(r) === invCode);
  if (!item) return;

  isEditMode = true;
  if (modalTitle) modalTitle.textContent = "Edit Inventory Record";

  if (inventoryIdInput) inventoryIdInput.value = invCode;
  if (productNameInput) productNameInput.value = item.product_name || item.name;
  if (categoryInput) categoryInput.value = item.category_id || '';
  if (priceInput) priceInput.value = item.unit_price;
  if (stockInput) stockInput.value = getStockQty(item);

  modal.classList.add('active');
};

function closeModal() {
  modal.classList.remove('active');
  if (productForm) productForm.reset();
}

// ---------- Submit (Có kiểm tra chặn số âm) ----------
async function handleFormSubmit(e) {
  e.preventDefault();

  const stockQty = parseInt(stockInput.value);
  const unitPrice = parseFloat(priceInput.value);

  // Chặn không cho nhập số lượng hoặc giá tiền âm
  if (isNaN(stockQty) || stockQty < 0) {
    showToast("Stock quantity cannot be negative!");
    return;
  }
  if (isNaN(unitPrice) || unitPrice < 0) {
    showToast("Unit price cannot be negative!");
    return;
  }

  const payload = {
    product_name: productNameInput.value.trim(),
    category_id: parseInt(categoryInput.value) || 1,
    unit_price: unitPrice,
    stock_quantity: stockQty
  };

  try {
    let response;
    if (isEditMode) {
      response = await fetch(`${API_URL}/${inventoryIdInput.value}`, {
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
      const errData = await response.json();
      throw new Error(errData.detail || "Action failed.");
    }

    showToast(isEditMode ? "Updated inventory record successfully!" : "Added new inventory record successfully!");
    closeModal();
    fetchInventory();
  } catch (error) {
    console.error("Server Error Details:", error.message);
    showToast(error.message || "Something went wrong on the server. Please try again later.");
  }
}

// ---------- Delete ----------
function closeDeleteConfirmation() {
  deleteInventoryModal?.classList.remove('active');
  pendingDeleteCode = null;
  if (confirmDeleteInventoryBtn) {
    confirmDeleteInventoryBtn.disabled = false;
    confirmDeleteInventoryBtn.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i> Delete record';
  }
  deleteTrigger?.focus();
  deleteTrigger = null;
}

window.deleteProduct = function(invCode, trigger) {
  if (isEmployee || !deleteInventoryModal) return;
  pendingDeleteCode = invCode;
  deleteTrigger = trigger instanceof HTMLElement ? trigger : document.activeElement;
  deleteInventoryCode.textContent = invCode;
  deleteInventoryModal.classList.add('active');
  confirmDeleteInventoryBtn?.focus();
};

async function confirmDeleteProduct() {
  if (!pendingDeleteCode || !confirmDeleteInventoryBtn) return;
  const invCode = pendingDeleteCode;
  confirmDeleteInventoryBtn.disabled = true;
  confirmDeleteInventoryBtn.textContent = 'Deleting...';
  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(invCode)}`, { method: "DELETE" });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to delete record.");
    }
    closeDeleteConfirmation();
    showToast("Deleted inventory record successfully!");
    await fetchInventory();
  } catch (error) {
    console.error("Server Error Details:", error.message);
    showToast(error.message || "Something went wrong on the server. Please try again later.");
    confirmDeleteInventoryBtn.disabled = false;
    confirmDeleteInventoryBtn.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i> Delete record';
  }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  populateStatusFilter();
  loadCategories();
  fetchInventory();

  if (searchInput) searchInput.addEventListener('input', filterData);
  if (categoryFilter) categoryFilter.addEventListener('change', filterData);
  if (statusFilter) statusFilter.addEventListener('change', filterData);

  if (openModalBtn) openModalBtn.addEventListener('click', openAddProductModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
  if (productForm) productForm.addEventListener('submit', handleFormSubmit);

  // Thêm thuộc tính min="0" trực tiếp cho các input số lượng/giá để giao diện tự chặn dấu trừ (-)
  if (stockInput) stockInput.setAttribute('min', '0');
  if (priceInput) priceInput.setAttribute('min', '0');

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  confirmDeleteInventoryBtn?.addEventListener('click', confirmDeleteProduct);
  cancelDeleteInventoryBtn?.addEventListener('click', closeDeleteConfirmation);

  if (deleteInventoryModal) {
    deleteInventoryModal.addEventListener('click', event => {
      if (event.target === deleteInventoryModal) closeDeleteConfirmation();
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && deleteInventoryModal?.classList.contains('active')) {
      closeDeleteConfirmation();
    }
  });
});