const salesData = [
  { id: "P-001", name: "Oolong Milk Tea", category: "Beverage", unitsSold: 420, price: 35000, cost: 15000, currentStock: 15 },
  { id: "P-002", name: "Salted Coffee", category: "Beverage", unitsSold: 310, price: 29000, cost: 10000, currentStock: 50 },
  { id: "P-003", name: "Pork Skin Baguette", category: "Food", unitsSold: 250, price: 20000, cost: 8000, currentStock: 80 },
  { id: "P-004", name: "Tropical Fruit Tea", category: "Beverage", unitsSold: 180, price: 42000, cost: 18000, currentStock: 8 },
  { id: "P-005", name: "Tiramisu Cake", category: "Dessert", unitsSold: 80, price: 45000, cost: 22000, currentStock: 5 },
  { id: "P-006", name: "Hand-Pounded Lemon Tea", category: "Beverage", unitsSold: 290, price: 25000, cost: 9000, currentStock: 30 },
  { id: "P-007", name: "Butter Croissant", category: "Food", unitsSold: 150, price: 35000, cost: 14000, currentStock: 12 }
];

const toast = document.getElementById('toastNotification');

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
  } else if (tabName === 'prediction') {
    document.getElementById('tab-prediction').classList.add('active');
    document.getElementById('btn-prediction').classList.add('active');
    renderPredictionTable();
  }
}

function applyFilters() {
  const topNDropdown = document.getElementById('topNDropdown');
  const categoryInput = document.getElementById('categoryInput');
  const timeframeFilter = document.getElementById('timeframeFilter');

  let timeMultiplier = 1;
  const timeframe = timeframeFilter ? timeframeFilter.value : 'monthly';
  if (timeframe === 'daily') timeMultiplier = 1 / 30;
  else if (timeframe === 'weekly') timeMultiplier = 7 / 30;

  let processedData = salesData.map(item => {
    const adjustedUnits = Math.round(item.unitsSold * timeMultiplier);
    const adjustedRevenue = adjustedUnits * item.price;
    return {
      ...item,
      unitsSoldAdjusted: adjustedUnits,
      revenueAdjusted: adjustedRevenue
    };
  }).sort((a, b) => b.revenueAdjusted - a.revenueAdjusted);

  const categoryTerm = categoryInput ? categoryInput.value.toLowerCase().trim() : '';
  if (categoryTerm !== '') {
    processedData = processedData.filter(item => 
      item.category.toLowerCase().includes(categoryTerm)
    );
  }

  const limitValue = topNDropdown ? topNDropdown.value : 'ALL';
  if (limitValue !== 'ALL') {
    processedData = processedData.slice(0, parseInt(limitValue));
  }

  renderSalesTable(processedData);
}

function renderSalesTable(dataToRender) {
  const tbody = document.getElementById('topSellingTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (dataToRender.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 25px;">No matching items found</td></tr>`;
    return;
  }

  dataToRender.forEach((item, index) => {
    const margin = (((item.price - item.cost) / item.price) * 100).toFixed(1);
    const rank = index + 1;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; color: ${rank <= 3 ? 'var(--color-accent-red)' : 'var(--text-muted)'};">#${rank}</td>
      <td style="font-weight: 600; color: var(--text-muted);">${item.id}</td>
      <td style="font-weight: 600; color: var(--bg-sidebar);">${item.name}</td>
      <td><span class="badge" style="background: #EAECEE; color: #2C3E50;">${item.category}</span></td>
      <td>${item.unitsSoldAdjusted.toLocaleString('en-US')} units</td>
      <td>${item.price.toLocaleString('en-US')} ₫</td>
      <td style="font-weight: 700; color: var(--bg-sidebar);">${item.revenueAdjusted.toLocaleString('en-US')} ₫</td>
      <td><span class="badge badge-success">${margin}%</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPredictionTable() {
  const tbody = document.getElementById('predictionTableBody');
  const selectElement = document.getElementById('predictionWindowSelect');
  const windowDays = parseInt(selectElement ? selectElement.value : "30");
  if (!tbody) return;
  tbody.innerHTML = '';

  const predictionList = salesData.map(item => {
    const dailyRate = item.unitsSold / 30; 
    const predictedDemand = Math.round(dailyRate * windowDays);
    const safetyStock = 10; 
    const suggestedRestock = Math.max(0, predictedDemand - item.currentStock + safetyStock);

    let priorityScore = 3;
    let statusBadge = '';

    if (item.currentStock < 10) {
      priorityScore = 1;
      statusBadge = `<span class="badge badge-danger">Critical Deficit</span>`;
    } else if (suggestedRestock > 0) {
      priorityScore = 2;
      statusBadge = `<span class="badge badge-warning">Restock Needed</span>`;
    } else {
      priorityScore = 3;
      statusBadge = `<span class="badge badge-success">Sufficient Stock</span>`;
    }

    return {
      ...item,
      predictedDemand,
      suggestedRestock,
      priorityScore,
      statusBadge
    };
  });

  predictionList.sort((a, b) => a.priorityScore - b.priorityScore);

  predictionList.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600; color: var(--text-muted);">${item.id}</td>
      <td style="font-weight: 600; color: var(--bg-sidebar);">${item.name}</td>
      <td>${item.currentStock} items</td>
      <td><strong>${item.predictedDemand}</strong> items / ${windowDays} days</td>
      <td style="color: var(--color-accent-red); font-weight: 700;">+${item.suggestedRestock} items</td>
      <td>${item.statusBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const topNDropdown = document.getElementById('topNDropdown');
  const categoryInput = document.getElementById('categoryInput');
  const timeframeFilter = document.getElementById('timeframeFilter');

  if (topNDropdown) topNDropdown.addEventListener('change', applyFilters);
  if (categoryInput) {
    categoryInput.addEventListener('input', applyFilters);
    categoryInput.addEventListener('change', applyFilters);
  }
  if (timeframeFilter) timeframeFilter.addEventListener('change', applyFilters);

  const btnReset = document.getElementById('btnResetFilter');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (topNDropdown) topNDropdown.value = '5';
      if (categoryInput) categoryInput.value = '';
      if (timeframeFilter) timeframeFilter.value = 'monthly';
      applyFilters();
      showToast("Filters reset to default");
    });
  }

  const btnOverview = document.getElementById('btn-overview');
  const btnPrediction = document.getElementById('btn-prediction');
  if (btnOverview) btnOverview.addEventListener('click', () => switchTab('overview'));
  if (btnPrediction) btnPrediction.addEventListener('click', () => switchTab('prediction'));

  const predictionSelect = document.getElementById('predictionWindowSelect');
  if (predictionSelect) predictionSelect.addEventListener('change', renderPredictionTable);

  applyFilters();
});