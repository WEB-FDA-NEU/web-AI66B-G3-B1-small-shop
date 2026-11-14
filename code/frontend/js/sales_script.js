const API_SALES_URL = "http://127.0.0.1:8000/sales";
const toast = document.getElementById('toastNotification');

let salesLineChartInstance = null;
let unitsBarChartInstance = null;

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

function resetSalesKpis() {
  ['kpiSales', 'kpiOrders'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '--';
  });
  const trendEl = document.getElementById('kpiSalesTrend');
  if (trendEl) trendEl.textContent = '';
}

async function fetchSalesOverview() {
  const topNDropdown = document.getElementById('topNDropdown');
  const categoryInput = document.getElementById('categoryInput');
  const timeframeFilter = document.getElementById('timeframeFilter');

  const topN = topNDropdown ? topNDropdown.value : '5';
  const category = categoryInput ? categoryInput.value.trim() : '';
  const timeframe = timeframeFilter ? timeframeFilter.value : 'this_month';

  let url = `${API_SALES_URL}/overview?top_n=${topN}&timeframe=${timeframe}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to load sales analytics from server.");
    }
    const data = await response.json();
    
    // Giả lập hoặc nhận dữ liệu tổng hợp (Kpis, Charts, Table) từ backend trả về
    renderSalesOverviewDashboard(data, { topN, category, timeframe });
  } catch (error) {
    resetSalesKpis();
    console.error("Server Error Details:", error.message); 
    showToast("Something went wrong on the server. Please try again later.");
  }

}

function renderSalesOverviewDashboard(responseObj, filters) {
  const items = Array.isArray(responseObj) ? responseObj : (responseObj.products || []);
  const kpis = responseObj.kpis || {};
  const timelineData = responseObj.timeline || { labels: [], values: [] };

  // 1. Cập nhật KPI Cards (dữ liệu thật từ backend, không dùng số giả)
  const totalSales = Number(kpis.total_sales ?? 0);
  const completedOrders = Number(kpis.completed_orders ?? 0);

  const kpiSalesEl = document.getElementById('kpiSales');
  const kpiOrdersEl = document.getElementById('kpiOrders');
  const kpiTrendEl = document.getElementById('kpiSalesTrend');
  const kpiOrdersNoteEl = document.getElementById('kpiOrdersNote');

  if (kpiSalesEl) kpiSalesEl.textContent = totalSales.toLocaleString('en-US') + " ₫";
  if (kpiOrdersEl) kpiOrdersEl.textContent = completedOrders.toLocaleString('en-US');
  if (kpiTrendEl) kpiTrendEl.textContent = kpis.trend || "";
  if (kpiOrdersNoteEl) kpiOrdersNoteEl.textContent = "Delivered orders";

  // 2. Cập nhật tiêu đề mô tả (Dashboard & Summary Table)
  const topText = filters.topN === "ALL" ? "All" : `Top ${filters.topN}`;
  const categoryText = filters.category ? ` in ${filters.category}` : "";
  const timeframeLabels = {
    "this_day": "This Day",
    "this_week": "This Week",
    "this_month": "This Month",
    "all_time": "All Time"
  };
  const tfText = timeframeLabels[filters.timeframe] || "This Month";

  document.getElementById('dashboardSubtitle').textContent = `Visual breakdown of shop sales trend and product unit performance (${tfText})`;
  document.getElementById('summaryTableSubtitle').textContent = `${topText} products${categoryText} ranked by total revenue during ${tfText}`;

  // 3. Render Line Graph (Bên trái)
  if (salesLineChartInstance) salesLineChartInstance.destroy();
  const lineCtx = document.getElementById('salesLineChart').getContext('2d');
  salesLineChartInstance = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: timelineData.labels,
      datasets: [{
        label: "Sales (₫)",
        data: timelineData.values,
        borderColor: "#800000",
        backgroundColor: "rgba(128, 0, 0, 0.08)",
        borderWidth: 2.5,
        pointBackgroundColor: "#800000",
        pointRadius: 4,
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => " " + Number(ctx.parsed.y).toLocaleString('en-US') + " ₫"
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#e5ddd3" }
        },
        x: { grid: { display: false } }
      }
    }
  });

  // 4. Render Bar Chart Units Sold (Bên phải) - Sắp xếp theo units sold
  const sortedByUnits = [...items].sort((a, b) => {
    const uA = a.units_sold_adjusted ?? a.units_sold ?? 0;
    const uB = b.units_sold_adjusted ?? b.units_sold ?? 0;
    return uB - uA;
  });

  if (unitsBarChartInstance) unitsBarChartInstance.destroy();
  const barCtx = document.getElementById('unitsBarChart').getContext('2d');
  unitsBarChartInstance = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: sortedByUnits.map(p => p.name || 'Product'),
      datasets: [{
        label: "Units Sold",
        data: sortedByUnits.map(p => p.units_sold_adjusted ?? p.units_sold ?? 0),
        backgroundColor: "#0F414A",
        borderRadius: 6,
        maxBarThickness: 42
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} units sold`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#e5ddd3" }
        },
        x: { grid: { display: false } }
      }
    }
  });

  // 5. Render Summary Table (Sắp xếp theo Total Revenue giảm dần)
  const sortedByRevenue = [...items].sort((a, b) => {
    const rA = a.revenue_adjusted ?? a.total_revenue ?? 0;
    const rB = b.revenue_adjusted ?? b.total_revenue ?? 0;
    return rB - rA;
  });

  renderSalesTable(sortedByRevenue);
}

function renderSalesTable(dataToRender) {
  const tbody = document.getElementById('topSellingTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!dataToRender || dataToRender.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 25px;">No matching items found</td></tr>`;
    return;
  }

  dataToRender.forEach((item, index) => {
    const rank = item.rank || (index + 1);
    const id = item.id || `P-${String(item.product_id || 1).padStart(3, '0')}`;
    const name = item.name || 'Unknown Product';
    const category = item.category || 'General';
    const unitsSold = item.units_sold_adjusted ?? item.units_sold ?? 0;
    const price = item.price ?? item.unit_price ?? 0;
    const revenue = item.revenue_adjusted ?? item.total_revenue ?? (unitsSold * price);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; color: ${rank <= 3 ? 'var(--color-accent-red, #b30000)' : 'var(--text-muted)'};">#${rank}</td>
      <td style="font-weight: 600; color: var(--text-muted);">${id}</td>
      <td style="font-weight: 600; color: var(--bg-sidebar);">${name}</td>
      <td><span class="badge" style="background: #EAECEE; color: #2C3E50;">${category}</span></td>
      <td>${Number(unitsSold).toLocaleString('en-US')} units</td>
      <td>${Number(price).toLocaleString('en-US')} ₫</td>
      <td style="font-weight: 700; color: var(--bg-sidebar);">${Number(revenue).toLocaleString('en-US')} ₫</td>
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

async function loadSalesCategoriesDropdown() {
  const categorySelect = document.getElementById('categoryInput');
  if (!categorySelect) return;

  try {
    const response = await fetch("http://127.0.0.1:8000/categories");
    if (!response.ok) throw new Error("Failed to load categories");
    
    const categories = await response.json();
    categorySelect.innerHTML = '<option value="">All Categories</option>';
    
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.category_name; 
      option.textContent = cat.category_name;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSalesCategoriesDropdown();

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
      if (timeframeFilter) timeframeFilter.value = 'this_month';
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