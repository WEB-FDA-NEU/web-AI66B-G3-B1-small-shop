const API_URL = "http://127.0.0.1:8000/inventory";
const CATEGORIES_URL = "http://127.0.0.1:8000/categories";

let products = [];
let isEditMode = false;

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

// Form Input Elements (Lưu trữ SKU)
const skuInput = document.createElement('input');
skuInput.type = 'hidden';
skuInput.id = 'sku';
if (productForm) productForm.appendChild(skuInput);

const productNameInput = document.getElementById('productName');
const categoryInput = document.getElementById('category');
const priceInput = document.getElementById('price');
const stockInput = document.getElementById('stock');

// Format Currency VND
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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

// Fetch inventory data from API
async function fetchProducts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Failed to load inventory from server.");
    
    products = await response.json();
    
    // Sắp xếp danh sách theo product_id tăng dần
    products.sort((a, b) => {
      const idA = a.product_id || parseInt((a.sku || '').replace(/\D/g, '')) || 0;
      const idB = b.product_id || parseInt((b.sku || '').replace(/\D/g, '')) || 0;
      return idA - idB;
    });

    filterData();
  } catch (error) {
    console.error("Server Error Details:", error.message); 
    showToast("Something went wrong on the server. Please try again later.");
  }
}

// Render Table Rows
function renderTable(data) {
  tableBody.innerHTML = '';
  
  if (!data || data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No matching products found in inventory.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement('tr');
    const skuCode = item.sku || `P-${String(item.product_id).padStart(3, '0')}`;
    const displayCategory = item.category_name || item.category || 'General';
    const stockQty = item.stock_quantity !== undefined ? item.stock_quantity : (item.stock || 0);
    
    // Đảm bảo 3 trạng thái
    const statusText = item.status || (stockQty > 5 ? "In Stock" : "Low Stock");
    const badgeClass = item.badge_class || (stockQty > 5 ? "badge-instock" : "badge-expired");
    
    tr.innerHTML = `
      <td class="item-sku">${skuCode}</td>
      <td style="font-weight: 600; color: var(--bg-sidebar);">${item.product_name || item.name}</td>
      <td><span class="badge" style="background: #EAECEE; color: #2C3E50;">${displayCategory}</span></td>
      <td>${formatVND(item.unit_price)}</td>
      <td style="font-weight: 600;">${stockQty}</td>
      <td>${item.import_date || '—'}</td>
      <td><span class="badge ${badgeClass}">${statusText}</span></td>
      <td>
        <div class="action-buttons" style="justify-content: flex-end;">
          <button class="btn-icon" title="Edit Product" onclick="openEditProductModal('${skuCode}')">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon delete" title="Delete Product" onclick="deleteProduct('${skuCode}')">
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
  const selectedCategory = categoryFilter ? categoryFilter.value : '';
  const selectedStatus = statusFilter ? statusFilter.value : '';

  const filtered = products.filter(item => {
    const skuCode = (item.sku || `p-${String(item.product_id).padStart(3, '0')}`).toLowerCase();
    const productName = (item.product_name || item.name || '').toLowerCase();
    
    const stockQty = item.stock_quantity !== undefined ? item.stock_quantity : (item.stock || 0);
    const itemStatus = item.status || (stockQty > 5 ? "In Stock" : "Low Stock");
    
    const matchesSearch = productName.includes(searchTerm) || skuCode.includes(searchTerm);
    const matchesCategory = selectedCategory === "" || (item.category_name || item.category) === selectedCategory;
    const matchesStatus = selectedStatus === "" || (itemStatus === selectedStatus);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  renderTable(filtered);
}

// Open Modal in ADD Mode
function openAddProductModal() {
  isEditMode = false;
  if (modalTitle) modalTitle.textContent = "Add New Product";
  if (productForm) productForm.reset();
  if (skuInput) skuInput.value = '';
  modal.classList.add('active');
}

// Open Modal in EDIT Mode
window.openEditProductModal = function(sku) {
  const item = products.find(p => (p.sku || `P-${String(p.product_id).padStart(3, '0')}`) === sku);
  if (!item) return;

  isEditMode = true;
  if (modalTitle) modalTitle.textContent = "Edit Product";

  if (skuInput) skuInput.value = sku;
  if (productNameInput) productNameInput.value = item.product_name || item.name;
  if (categoryInput) categoryInput.value = item.category_id || '';
  if (priceInput) priceInput.value = item.unit_price;
  if (stockInput) stockInput.value = item.stock_quantity !== undefined ? item.stock_quantity : (item.stock || 0);

  modal.classList.add('active');
};

// Close Modal
function closeModal() {
  modal.classList.remove('active');
  if (productForm) productForm.reset();
}

// Form Submit Handler
async function handleFormSubmit(e) {
  e.preventDefault();

  const payload = {
    product_name: productNameInput.value.trim(),
    category_id: parseInt(categoryInput.value) || 1,
    unit_price: parseFloat(priceInput.value) || 0,
    stock_quantity: parseInt(stockInput.value) || 0
  };

  try {
    let response;
    if (isEditMode) {
      const sku = skuInput.value;
      response = await fetch(`${API_URL}/${sku}`, {
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

    showToast(isEditMode ? "Updated product successfully!" : "Added new product successfully!");
    closeModal();
    fetchProducts();
  } catch (error) {
    console.error("Server Error Details:", error.message); 
    showToast("Something went wrong on the server. Please try again later.");
  }
}

// Delete Product Handler
window.deleteProduct = async function(sku) {
  if (!confirm(`Are you sure you want to delete product SKU ${sku}?`)) return;

  try {
    const response = await fetch(`${API_URL}/${sku}`, { method: "DELETE" });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to delete product.");
    }
    showToast("Deleted product successfully!");
    fetchProducts();
  } catch (error) {
    console.error("Server Error Details:", error.message); 
    showToast("Something went wrong on the server. Please try again later.");
  }
};

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();   
  
  if (searchInput) searchInput.addEventListener('input', filterData);
  if (categoryFilter) categoryFilter.addEventListener('change', filterData);
  if (statusFilter) statusFilter.addEventListener('change', filterData);

  if (openModalBtn) openModalBtn.addEventListener('click', openAddProductModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
  if (productForm) productForm.addEventListener('submit', handleFormSubmit);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
});