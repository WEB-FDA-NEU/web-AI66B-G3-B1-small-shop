// Synchronized Initial Data with Sales Page (sales_script.js)
// BR-4 Rule: Items imported > 10 days ago automatically trigger Expired/Disposal status.
const initialProducts = [
  { sku: "P-001", name: "Oolong Milk Tea", category: "Beverage", price: 35000, stock: 15, minStock: 10, importDate: "20/03/2026" },
  { sku: "P-002", name: "Salted Coffee", category: "Beverage", price: 29000, stock: 50, minStock: 10, importDate: "22/03/2026" },
  { sku: "P-003", name: "Pork Skin Baguette", category: "Food", price: 20000, stock: 80, minStock: 15, importDate: "24/03/2026" },
  { sku: "P-004", name: "Tropical Fruit Tea", category: "Beverage", price: 42000, stock: 8, minStock: 10, importDate: "18/03/2026" },
  { sku: "P-005", name: "Tiramisu Cake", category: "Dessert", price: 45000, stock: 5, minStock: 10, importDate: "10/03/2026" }, // > 10 days => Expired
  { sku: "P-006", name: "Hand-Pounded Lemon Tea", category: "Beverage", price: 25000, stock: 30, minStock: 10, importDate: "21/03/2026" },
  { sku: "P-007", name: "Butter Croissant", category: "Food", price: 35000, stock: 12, minStock: 10, importDate: "23/03/2026" }
];

let products = [...initialProducts];
let isEditMode = false;
let currentEditSku = null;

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

// Helper: Calculate dynamic status based on BR-2, BR-4
function calculateStatus(item) {
  // BR-4: Parse date (DD/MM/YYYY) & check if imported > 10 days
  const parts = item.importDate.split('/');
  if (parts.length === 3) {
    const importDateObj = new Date(parts[2], parts[1] - 1, parts[0]);
    const today = new Date();
    const diffTime = Math.abs(today - importDateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 10) {
      return { text: "Expired / Disposal", badgeClass: "badge-expired" };
    }
  }

  // Stock Status Check
  if (item.stock <= item.minStock) {
    return { text: "Low Stock", badgeClass: "badge-lowstock" };
  }

  return { text: "In Stock", badgeClass: "badge-instock" };
}

// Format Currency VND
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Render Table Rows (Without Icons in Name column)
function renderTable(data) {
  tableBody.innerHTML = '';
  if (data.length === 0) {
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
    const statusInfo = calculateStatus(item);

    tr.innerHTML = `
      <td class="item-sku">${item.sku}</td>
      <td style="font-weight: 600; color: var(--bg-sidebar);">${item.name}</td>
      <td><span class="badge" style="background: #EAECEE; color: #2C3E50;">${item.category}</span></td>
      <td>${formatVND(item.price)}</td>
      <td style="font-weight: 600;">${item.stock}</td>
      <td>${item.importDate}</td>
      <td><span class="badge ${statusInfo.badgeClass}">${statusInfo.text}</span></td>
      <td>
        <div class="action-buttons" style="justify-content: flex-end;">
          <button class="btn-icon" title="Edit Product" onclick="openEditProductModal('${item.sku}')">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon delete" title="Delete Product" onclick="deleteProduct('${item.sku}')">
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
    const matchesSearch = item.name.toLowerCase().includes(searchTerm) || 
                          item.sku.toLowerCase().includes(searchTerm);
    const matchesCategory = selectedCategory === "" || item.category === selectedCategory;
    
    const statusInfo = calculateStatus(item);
    const matchesStatus = selectedStatus === "" || statusInfo.text.includes(selectedStatus);

    return matchesSearch && matchesCategory && matchesStatus;
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
function openAddProductModal() {
  isEditMode = false;
  currentEditSku = null;
  
  if (modalTitle) modalTitle.textContent = "Add New Product";
  if (productForm) productForm.reset();
  
  modal.classList.add('active');
}

// Open Modal in EDIT Mode
window.openEditProductModal = function(sku) {
  const item = products.find(p => p.sku === sku);
  if (!item) return;

  isEditMode = true;
  currentEditSku = sku;

  if (modalTitle) modalTitle.textContent = "Edit Product";

  // Fill form fields
  if (document.getElementById('productName')) document.getElementById('productName').value = item.name;
  if (document.getElementById('category')) document.getElementById('category').value = item.category;
  if (document.getElementById('price')) document.getElementById('price').value = item.price;
  if (document.getElementById('stock')) document.getElementById('stock').value = item.stock;
  if (document.getElementById('minStock')) document.getElementById('minStock').value = item.minStock || 10;

  modal.classList.add('active');
};

// Close Modal
function closeModal() {
  modal.classList.remove('active');
  if (productForm) productForm.reset();
}

// Form Submit Handler (Handles both ADD and EDIT)
function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('category').value;
  const price = parseFloat(document.getElementById('price').value) || 0;
  const stock = parseInt(document.getElementById('stock').value) || 0;
  const minStock = parseInt(document.getElementById('minStock').value) || 10;

  if (!name || price < 0 || stock < 0) {
    showToast("Please enter valid product information!");
    return;
  }

  if (isEditMode) {
    // EDIT LOGIC
    const index = products.findIndex(p => p.sku === currentEditSku);
    if (index !== -1) {
      products[index].name = name;
      products[index].category = category;
      products[index].price = price;
      products[index].stock = stock;
      products[index].minStock = minStock;

      showToast(`Updated product "${name}" successfully`);
    }
  } else {
    // ADD LOGIC
    const newSku = `P-00${products.length + 1}`;
    const today = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

    const newProduct = {
      sku: newSku,
      name: name,
      category: category,
      price: price,
      stock: stock,
      minStock: minStock,
      importDate: today
    };

    products.unshift(newProduct);
    showToast(`Added product "${name}" successfully`);
  }

  filterData();
  closeModal();
}

// Delete Product Handler
window.deleteProduct = function(sku) {
  const item = products.find(p => p.sku === sku);
  if (item) {
    products = products.filter(p => p.sku !== sku);
    filterData();
    showToast(`Deleted product "${item.name}"`);
  }
};

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
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

  // Initial render
  renderTable(products);
});