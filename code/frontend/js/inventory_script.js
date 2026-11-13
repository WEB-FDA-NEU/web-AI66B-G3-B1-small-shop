const API_URL = "http://127.0.0.1:8000/products";
const CATEGORIES_URL = "http://127.0.0.1:8000/categories";

let products = [];
let categoriesList = [];
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

// Form Input Elements
const productIdInput = document.createElement('input');
productIdInput.type = 'hidden';
productIdInput.id = 'productId';
if (productForm) productForm.appendChild(productIdInput);

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

// Fetch categories from Database API
async function loadCategories() {
  try {
    const response = await fetch(CATEGORIES_URL);
    if (!response.ok) throw new Error("Failed to load categories.");
    
    categoriesList = await response.json();
    
    // 1. Populate Filter Select
    if (categoryFilter) {
      categoryFilter.innerHTML = '<option value="">All Categories</option>';
      categoriesList.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.category_name;
        option.textContent = cat.category_name;
        categoryFilter.appendChild(option);
      });
    }

    // 2. Populate Modal Category Select
    if (categoryInput) {
      categoryInput.innerHTML = '<option value="">-- Select Category --</option>';
      categoriesList.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.category_id; // Lưu category_id để gửi xuống DB chính xác
        option.textContent = cat.category_name;
        categoryInput.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}

// Fetch products from API
async function fetchProducts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Failed to load products from server.");
    
    products = await response.json();
    filterData();
  } catch (error) {
    showToast(error.message);
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
    const idDisplay = `P-${String(item.product_id).padStart(3, '0')}`;
    const isAvailable = item.is_available !== false;
    const statusText = isAvailable ? "In Stock" : "Unavailable";
    const badgeClass = isAvailable ? "badge-instock" : "badge-expired";
    const displayCategory = item.category_name || item.category || 'General';
    
    tr.innerHTML = `
      <td class="item-sku">${idDisplay}</td>
      <td style="font-weight: 600; color: var(--bg-sidebar);">${item.name}</td>
      <td><span class="badge" style="background: #EAECEE; color: #2C3E50;">${displayCategory}</span></td>
      <td>${formatVND(item.unit_price)}</td>
      <td style="font-weight: 600;">${item.stock || 50}</td>
      <td>2026-10-01</td>
      <td><span class="badge ${badgeClass}">${statusText}</span></td>
      <td>
        <div class="action-buttons" style="justify-content: flex-end;">
          <button class="btn-icon" title="Edit Product" onclick="openEditProductModal(${item.product_id})">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon delete" title="Delete Product" onclick="deleteProduct(${item.product_id})">
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

  const filtered = products.filter(item => {
    const idFormatted = `p-${String(item.product_id).padStart(3, '0')}`;
    const matchesSearch = (item.name && item.name.toLowerCase().includes(searchTerm)) || 
                          idFormatted.includes(searchTerm);
    const matchesCategory = selectedCategory === "" || (item.category_name || item.category) === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  renderTable(filtered);
}

// Open Modal in ADD Mode
function openAddProductModal() {
  isEditMode = false;
  if (modalTitle) modalTitle.textContent = "Add New Product";
  if (productForm) productForm.reset();
  if (productIdInput) productIdInput.value = '';
  modal.classList.add('active');
}

// Open Modal in EDIT Mode
window.openEditProductModal = function(id) {
  const item = products.find(p => p.product_id === id);
  if (!item) return;

  isEditMode = true;
  if (modalTitle) modalTitle.textContent = "Edit Product";

  if (productIdInput) productIdInput.value = item.product_id;
  if (productNameInput) productNameInput.value = item.name;
  if (categoryInput) categoryInput.value = item.category_id || '';
  if (priceInput) priceInput.value = item.unit_price;
  if (stockInput) stockInput.value = item.stock || 50;

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
    name: productNameInput.value.trim(),
    category_id: parseInt(categoryInput.value) || 1,
    unit_price: parseFloat(priceInput.value) || 0,
    is_available: true
  };

  try {
    let response;
    if (isEditMode) {
      const id = productIdInput.value;
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
      const errData = await response.json();
      throw new Error(errData.detail || "Action failed.");
    }

    showToast(isEditMode ? "Updated product successfully!" : "Added new product successfully!");
    closeModal();
    fetchProducts();
  } catch (error) {
    showToast(error.message);
  }
}

// Delete Product Handler
window.deleteProduct = async function(id) {
  if (!confirm(`Are you sure you want to delete product ID ${id}?`)) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to delete product.");
    }
    showToast("Deleted product successfully!");
    fetchProducts();
  } catch (error) {
    showToast(error.message);
  }
};

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  if (searchInput) searchInput.addEventListener('input', filterData);
  if (categoryFilter) categoryFilter.addEventListener('change', filterData);

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

document.addEventListener('DOMContentLoaded', () => {
  loadCategories(); // <--- Bắt buộc phải gọi hàm này để hiện đủ 6 categories trên giao diện
  fetchProducts();   // <--- Gọi hàm lấy sản phẩm để thay thế chữ "General" bằng tên category thực tế
  
  if (searchInput) searchInput.addEventListener('input', filterData);
  if (categoryFilter) categoryFilter.addEventListener('change', filterData);
});