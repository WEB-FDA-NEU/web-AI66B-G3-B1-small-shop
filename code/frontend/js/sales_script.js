const API_SALES_URL = "http://127.0.0.1:8000/sales";

const toast = document.getElementById('toastNotification');

// Show Toast Notification (Giống hệt trang Employee)
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function switchTab(tabName) {
  const tabs = document.querySelectorAll('.tab-content');
  const buttons = document.querySelectorAll('.tab-btn');

  tabs.forEach(tab => tab.classList.remove('active'));
  buttons.forEach(btn => btn.classList.remove('active'));

  if (tabName === 'overview') {
    document.getElementById('tab-overview').classList.add('active');
    document.getElementById('btn-overview').classList.add('active');
    fetchSalesOverview();
  } else if (tabName === 'prediction') {
    document.getElementById('tab-prediction').classList.add('active');
    document.getElementById('btn-prediction').classList.add('active');
    fetchPredictions();
  }
}

async function fetchSalesOverview() {
  const topNDropdown = document.getElementById('topNDropdown');
  const categoryInput = document.getElementById('categoryInput');
  const timeframeFilter = document.getElementById('timeframeFilter');

  const topN = topNDropdown ? topNDropdown.value : '5';
  const category = categoryInput ? categoryInput.value.trim() : '';
  const timeframe = timeframeFilter ? timeframeFilter.value : 'monthly';

  let url = `${API_SALES_URL}/overview?top_n=${topN}&timeframe=${timeframe}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to load sales analytics from server.");
    }
    const data = await response.json();
    renderSalesTable(data);
  } catch (error) {
    showToast(error.message);
  }
}

function renderSalesTable(dataToRender) {
  const tbody = document.getElementById('topSellingTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!dataToRender || dataToRender.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 25px;">No matching items found</td></tr>`;
    return;
  }

  dataToRender.forEach((item, index) => {
    const rank = item.rank || (index + 1);
    const id = item.id || `P-${String(item.product_id || 1).padStart(3, '0')}`;
    const name = item.name || 'Unknown Product';
    const category = item.category || 'General';
    const unitsSold = item.units_sold_adjusted ?? item.units_sold ?? item.unitsSoldAdjusted ?? 0;
    const price = item.price ?? item.unit_price ?? 0;
    const revenue = item.revenue_adjusted ?? item.total_revenue ?? (unitsSold * price);
    const margin = item.profit_margin ?? 40.0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; color: ${rank <= 3 ? 'var(--color-accent-red, #b30000)' : 'var(--text-muted)'};">#${rank}</td>
      <td style="font-weight: 600; color: var(--text-muted);">${id}</td>
      <td style="font-weight: 600; color: var(--bg-sidebar);">${name}</td>
      <td><span class="badge" style="background: #EAECEE; color: #2C3E50;">${category}</span></td>
      <td>${Number(unitsSold).toLocaleString('en-US')} units</td>
      <td>${Number(price).toLocaleString('en-US')} ₫</td>
      <td style="font-weight: 700; color: var(--bg-sidebar);">${Number(revenue).toLocaleString('en-US')} ₫</td>
      <td><span class="badge badge-success">${margin}%</span></td>
    `;
    tbody.appendChild(tr);
  });
}

async function fetchPredictions() {
  const selectElement = document.getElementById('predictionWindowSelect');
  const windowDays = parseInt(selectElement ? selectElement.value : "30");

  try {
    const response = await fetch(`${API_SALES_URL}/predictions?window_days=${windowDays}`);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to load demand predictions from server.");
    }
    const data = await response.json();
    renderPredictionTable(data, windowDays);
  } catch (error) {
    showToast(error.message);
  }
}

function renderPredictionTable(dataToRender, windowDays) {
  const tbody = document.getElementById('predictionTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!dataToRender || dataToRender.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 25px;">No prediction data available</td></tr>`;
    return;
  }

  dataToRender.forEach(item => {
    const id = item.id || `P-${String(item.product_id || 1).padStart(3, '0')}`;
    const name = item.name || 'Unknown Product';
    const currentStock = item.current_stock ?? item.currentStock ?? 0;
    const predictedDemand = item.predicted_demand ?? item.predictedDemand ?? 0;
    const suggestedRestock = item.suggested_restock ?? item.suggestedRestock ?? 0;
    
    let statusBadge = item.status_badge || item.statusBadge;
    if (!statusBadge) {
      if (currentStock <= 5) {
        statusBadge = `<span class="badge badge-danger">Critical Deficit</span>`;
      } else if (suggestedRestock > 0) {
        statusBadge = `<span class="badge badge-warning">Restock Needed</span>`;
      } else {
        statusBadge = `<span class="badge badge-success">Sufficient Stock</span>`;
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600; color: var(--text-muted);">${id}</td>
      <td style="font-weight: 600; color: var(--bg-sidebar);">${name}</td>
      <td>${currentStock} items</td>
      <td><strong>${predictedDemand}</strong> items / ${windowDays} days</td>
      <td style="color: var(--color-accent-red, #b30000); font-weight: 700;">+${suggestedRestock} items</td>
      <td>${statusBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const topNDropdown = document.getElementById('topNDropdown');
  const categoryInput = document.getElementById('categoryInput');
  const timeframeFilter = document.getElementById('timeframeFilter');

  if (topNDropdown) topNDropdown.addEventListener('change', fetchSalesOverview);
  if (categoryInput) categoryInput.addEventListener('change', fetchSalesOverview);
  if (timeframeFilter) timeframeFilter.addEventListener('change', fetchSalesOverview);

  const btnReset = document.getElementById('btnResetFilter');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (topNDropdown) topNDropdown.value = '5';
      if (categoryInput) categoryInput.value = '';
      if (timeframeFilter) timeframeFilter.value = 'monthly';
      fetchSalesOverview();
      showToast("Filters reset to default");
    });
  }

  const btnOverview = document.getElementById('btn-overview');
  const btnPrediction = document.getElementById('btn-prediction');
  if (btnOverview) btnOverview.addEventListener('click', () => switchTab('overview'));
  if (btnPrediction) btnPrediction.addEventListener('click', () => switchTab('prediction'));

  const predictionSelect = document.getElementById('predictionWindowSelect');
  if (predictionSelect) predictionSelect.addEventListener('change', fetchPredictions);

  fetchSalesOverview();
});

// Hàm tự động nạp 6 categories từ database cho trang Sales
async function loadSalesCategoriesDropdown() {
  const categorySelect = document.getElementById('categoryInput');
  if (!categorySelect) return;

  try {
    const response = await fetch("https://small-shop-tailscale.onrender.com/categories");
    if (!response.ok) throw new Error("Failed to load categories");
    
    const categories = await response.json();
    
    // Giữ lại option mặc định "All Categories" (hoặc "All")
    categorySelect.innerHTML = '<option value="">All Categories</option>';
    
    // Thêm danh sách 6 categories thực tế từ database
    categories.forEach(cat => {
      const option = document.createElement('option');
      // Gán giá trị bằng tên danh mục (hoặc cat.category_id tùy thuộc vào backend lọc theo tên hay ID)
      option.value = cat.category_name; 
      option.textContent = cat.category_name;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}

// Gọi hàm này bên trong sự kiện DOMContentLoaded hiện có của sales_script.js
document.addEventListener('DOMContentLoaded', () => {
  loadSalesCategoriesDropdown(); // <-- Thêm dòng này vào
  // ... các đoạn code khởi tạo khác giữ nguyên ...
});