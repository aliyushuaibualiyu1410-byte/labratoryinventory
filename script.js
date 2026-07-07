/**
 * =========================================================================
 * LABSTOCK PRO - APPLICATION ENGINE
 * =========================================================================
 */

// --- STATE MANAGEMENT ARCHITECTURE ---
let inventoryState = [];
let statusChartInstance = null;
let categoryChartInstance = null;

// Mock Admin Credentials (Easily pointing to backend services later)
const ADMIN_CREDENTIALS = { username: "admin", password: "password123" };

// --- CORE SYSTEM INITIALIZER ---
document.addEventListener("DOMContentLoaded", () => {
    checkSessionState();
    initializeDateTime();
    loadInventoryData();
    setupNavigationListeners();
    setupFormValidation();
    setupOperationalControls();
});

// --- LIVE DATE & TIME SYNC ---
function initializeDateTime() {
    const dateEl = document.getElementById("live-date");
    const syncTime = () => {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);
    };
    syncTime();
    setInterval(syncTime, 60000); // Sync every minute
}

// --- SECURE SESSION HANDLING ---
function checkSessionState() {
    const isLogged = localStorage.getItem("labstock_session");
    const loginView = document.getElementById("login-container");
    const appView = document.getElementById("app-container");

    if (isLogged === "active") {
        loginView.classList.add("hidden");
        appView.classList.remove("hidden");
        switchView("dashboard-view", "Dashboard Overview");
    } else {
        loginView.classList.remove("hidden");
        appView.classList.add("hidden");
    }
}

// --- APPLICATION NAVIGATION MANAGEMENT ---
function setupNavigationListeners() {
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            const viewTarget = item.getAttribute("data-target");
            const viewTitle = item.querySelector("span").textContent;
            switchView(viewTarget, viewTitle);
        });
    });

    // Notifications Dropdown Trigger
    const alertBell = document.getElementById("global-alert-trigger");
    const alertBox = document.getElementById("dropdown-alerts-box");
    alertBell.addEventListener("click", (e) => {
        e.stopPropagation();
        alertBox.classList.toggle("hidden");
    });
    document.addEventListener("click", () => alertBox.classList.add("hidden"));
}

function switchView(viewId, viewTitle) {
    document.querySelectorAll(".app-view").forEach(view => view.classList.add("hidden"));
    document.getElementById(viewId).classList.remove("hidden");
    document.getElementById("current-view-title").textContent = viewTitle;

    if (viewId === "reports-view") {
        renderSystemCharts();
    }
}

// --- AUTHENTICATION INTERACTION ENGINE ---
document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const userIn = document.getElementById("username").value.trim();
    const passIn = document.getElementById("password").value;
    const errorEl = document.getElementById("login-error");

    if (userIn === ADMIN_CREDENTIALS.username && passIn === ADMIN_CREDENTIALS.password) {
        errorEl.classList.add("hidden");
        localStorage.setItem("labstock_session", "active");
        checkSessionState();
        // Clear input security profiles
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
    } else {
        errorEl.classList.remove("hidden");
    }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("labstock_session");
    checkSessionState();
});

// --- PERSISTENT DATA INTERACTION LAYER ---
function loadInventoryData() {
    const rawData = localStorage.getItem("labstock_inventory");
    if (rawData) {
        inventoryState = JSON.parse(rawData);
    } else {
        // Fallback Seed Data for Demonstration & Testing Pipelines
        inventoryState = [
            { id: "INV-001", name: "Sodium Chloride", cas: "7647-14-5", category: "Reagents", location: "Cab A, S2", qty: 450, minQty: 100, unit: "g", expiry: "2028-12-10" },
            { id: "INV-002", name: "Hydrochloric Acid 37%", cas: "7647-01-0", category: "Reagents", location: "Acid Safe, C1", qty: 15, minQty: 20, unit: "L", expiry: "2027-04-15" },
            { id: "INV-003", name: "Petri Dishes 90mm", cas: "N/A", category: "Consumables", location: "Cab C, S5", qty: 200, minQty: 50, unit: "units", expiry: "2030-01-01" },
            { id: "INV-004", name: "Hydrogen Peroxide 30%", cas: "7722-84-1", category: "Reagents", location: "Fridge 1, D2", qty: 2, minQty: 5, unit: "L", expiry: "2026-05-20" }
        ];
        saveStateToStorage();
    }
    evaluateItemStatuses();
    rebuildInventoryDisplay();
}

function saveStateToStorage() {
    localStorage.setItem("labstock_inventory", JSON.stringify(inventoryState));
}

// --- LOGICAL METRIC COMPUTATION ENGINE ---
function evaluateItemStatuses() {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setMonth(now.getMonth() + 3); // 3 Months Expiry Alert Buffer Zone

    inventoryState.forEach(item => {
        const itemExpiry = new Date(item.expiry);
        const currentQty = parseFloat(item.qty);
        const triggerMin = parseFloat(item.minQty);

        if (itemExpiry <= now) {
            item.status = "expired";
        } else if (itemExpiry <= thresholdDate) {
            item.status = "expiring";
        } else if (currentQty <= triggerMin) {
            item.status = "low";
        } else {
            item.status = "normal";
        }
    });
}

// --- INTERFACE BUILDERS & RENDER ENGINES ---
function rebuildInventoryDisplay() {
    const tbody = document.getElementById("inventory-tbody");
    const searchVal = document.getElementById("search-inventory").value.toLowerCase();
    const filterVal = document.getElementById("filter-status").value;

    tbody.innerHTML = "";

    const filteredItems = inventoryState.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(searchVal) ||
            item.cas.toLowerCase().includes(searchVal) ||
            item.id.toLowerCase().includes(searchVal);
        const matchFilter = filterVal === "all" || item.status === filterVal;
        return matchSearch && matchFilter;
    });

    filteredItems.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${item.id}</strong></td>
            <td>
                <div>${item.name}</div>
                <small style="color:var(--text-muted)">Loc: ${item.location}</small>
            </td>
            <td>${item.cas}</td>
            <td><span class="category-tag">${item.category}</span></td>
            <td>${item.qty} ${item.unit} <br><small style="color:var(--text-muted)">Min: ${item.minQty}</small></td>
            <td>${item.expiry}</td>
            <td><span class="badge-status ${item.status}">${item.status.toUpperCase()}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon edit" onclick="openEditItemModal('${item.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-icon delete" onclick="deleteItemAction('${item.id}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updateMetricCards();
}

function updateMetricCards() {
    const counts = { total: inventoryState.length, low: 0, expiring: 0, expired: 0 };
    const alertList = [];
    const dashboardTbody = document.getElementById("dashboard-alerts-tbody");
    dashboardTbody.innerHTML = "";

    inventoryState.forEach(item => {
        if (item.status === "low") { counts.low++; alertList.push(item); }
        if (item.status === "expiring") { counts.expiring++; alertList.push(item); }
        if (item.status === "expired") { counts.expired++; alertList.push(item); }
    });

    // Sync Cards HTML
    document.getElementById("stat-total").textContent = counts.total;
    document.getElementById("stat-low").textContent = counts.low;
    document.getElementById("stat-expiring").textContent = counts.expiring;
    document.getElementById("stat-expired").textContent = counts.expired;

    // Sync Notification Bell Indicator
    const badge = document.getElementById("alert-badge");
    const listContainer = document.getElementById("alert-notifications-list");
    listContainer.innerHTML = "";

    const totalCritical = counts.low + counts.expiring + counts.expired;
    if (totalCritical > 0) {
        badge.textContent = totalCritical;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }

    // Populate Notification Bell Box & Dashboard Table View
    alertList.forEach(item => {
        let condText = item.status === 'low' ? `Low stock alert (${item.qty} ${item.unit} remaining)` : `Expiry Warning / Critical Level (${item.expiry})`;

        // Notification dropdown add item
        const li = document.createElement("li");
        li.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-warning"></i> <strong>${item.name}</strong>: ${condText}`;
        listContainer.appendChild(li);

        // Dashboard table add row
        const dTr = document.createElement("tr");
        dTr.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td><span class="badge-status ${item.status}">${item.status.toUpperCase()}</span></td>
            <td><small>${condText}</small></td>
        `;
        dashboardTbody.appendChild(dTr);
    });

    if (totalCritical === 0) {
        listContainer.innerHTML = "<li><i class='fa-solid fa-square-check text-success'></i> System clear. No metrics compromised.</li>";
        dashboardTbody.innerHTML = "<tr><td colspan='3' style='text-align:center; color:var(--text-muted);'>No items require immediate attention.</td></tr>";
    }
}

// --- CRUD SYSTEM FORM OPERATIONS ---
function setupOperationalControls() {
    const modal = document.getElementById("item-modal");

    document.getElementById("open-add-modal-btn").addEventListener("click", () => {
        document.getElementById("item-form").reset();
        document.getElementById("edit-item-id").value = "";
        document.getElementById("modal-title").textContent = "Add New Laboratory Item";
        modal.classList.remove("hidden");
    });

    const closeModal = () => modal.classList.add("hidden");
    document.getElementById("close-modal-btn").addEventListener("click", closeModal);
    document.getElementById("cancel-modal-btn").addEventListener("click", closeModal);

    // Filter and Search Action Triggers
    document.getElementById("search-inventory").addEventListener("input", rebuildInventoryDisplay);
    document.getElementById("filter-status").addEventListener("change", rebuildInventoryDisplay);

    // CSV File Output Execution Trigger
    document.getElementById("export-csv-btn").addEventListener("click", exportInventoryToCSV);

    // Report Document Print Execution
    document.getElementById("print-report-btn").addEventListener("click", () => window.print());
}

document.getElementById("item-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const editId = document.getElementById("edit-item-id").value;
    const name = document.getElementById("item-name").value.trim();
    const cas = document.getElementById("item-cas").value.trim() || "N/A";
    const category = document.getElementById("item-category").value;
    const location = document.getElementById("item-location").value.trim();
    const qty = parseFloat(document.getElementById("item-qty").value);
    const minQty = parseFloat(document.getElementById("item-min-qty").value);
    const unit = document.getElementById("item-unit").value.trim();
    const expiry = document.getElementById("item-expiry").value;

    if (editId) {
        // Edit Action Workflow
        const idx = inventoryState.findIndex(item => item.id === editId);
        if (idx !== -1) {
            inventoryState[idx] = { ...inventoryState[idx], name, cas, category, location, qty, minQty, unit, expiry };
        }
    } else {
        // Registration Create Action Workflow
        const newId = `INV-${String(inventoryState.length + 1).padStart(3, '0')}`;
        inventoryState.push({ id: newId, name, cas, category, location, qty, minQty, unit, expiry });
    }

    evaluateItemStatuses();
    saveStateToStorage();
    rebuildInventoryDisplay();
    document.getElementById("item-modal").classList.add("hidden");
});

window.openEditItemModal = function (id) {
    const item = inventoryState.find(i => i.id === id);
    if (!item) return;

    document.getElementById("edit-item-id").value = item.id;
    document.getElementById("item-name").value = item.name;
    document.getElementById("item-cas").value = item.cas;
    document.getElementById("item-category").value = item.category;
    document.getElementById("item-location").value = item.location;
    document.getElementById("item-qty").value = item.qty;
    document.getElementById("item-min-qty").value = item.minQty;
    document.getElementById("item-unit").value = item.unit;
    document.getElementById("item-expiry").value = item.expiry;

    document.getElementById("modal-title").textContent = `Modify Record - ${item.id}`;
    document.getElementById("item-modal").classList.remove("hidden");
};

window.deleteItemAction = function (id) {
    if (confirm(`Confirm permanent removal of record item data for ${id}?`)) {
        inventoryState = inventoryState.filter(item => item.id !== id);
        saveStateToStorage();
        evaluateItemStatuses();
        rebuildInventoryDisplay();
    }
};

// --- DATA EXPORT TO EXCEL / CSV INTERFACE ENGINE ---
function exportInventoryToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Item ID,Chemical Name,CAS Number,Category,Location,Quantity,Min Limit,Unit,Expiry Date,Alert Status\n";

    inventoryState.forEach(i => {
        let row = `"${i.id}","${i.name}","${i.cas}","${i.category}","${i.location}",${i.qty},${i.minQty},"${i.unit}","${i.expiry}","${i.status}"`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `LabStock_Pro_Inventory_2026.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

// --- DATA VISUALIZATION ENGINE (CHART.JS INTERACTION) ---
function renderSystemCharts() {
    // 1. Calculations Infrastructure
    const statusCounts = { normal: 0, low: 0, expiring: 0, expired: 0 };
    const categoryCounts = {};

    inventoryState.forEach(item => {
        statusCounts[item.status]++;
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });

    // Clean Existing Framework Chart Instances to avoid rendering conflicts
    if (statusChartInstance) statusChartInstance.destroy();
    if (categoryChartInstance) categoryChartInstance.destroy();

    // Chart Global Styling Adjustments
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';

    // Status Pie Chart Rendering Configuration
    const pieCtx = document.getElementById('statusPieChart').getContext('2d');
    statusChartInstance = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['Normal', 'Low Stock', 'Expiring Soon', 'Expired'],
            datasets: [{
                data: [statusCounts.normal, statusCounts.low, statusCounts.expiring, statusCounts.expired],
                backgroundColor: ['#10b981', '#f59e0b', '#c084fc', '#ef4444'],
                borderWidth: 2,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // Category Bar Chart Rendering Configuration
    const barCtx = document.getElementById('categoryBarChart').getContext('2d');
    categoryChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(categoryCounts),
            datasets: [{
                label: 'Distinct Items Count',
                data: Object.values(categoryCounts),
                backgroundColor: '#38bdf8',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function setupFormValidation() {
    // Prevent common date input syntax failures
    const dateInput = document.getElementById("item-expiry");
    if (dateInput) {
        const standardMinDate = new Date().toISOString().split("T")[0];
        // Can be initialized if retroactive dates are disallowed by lab workflows
    }
}