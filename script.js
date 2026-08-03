/* ==========================================================
   SmartSpend — Personal Expense Analytics Dashboard
   Vanilla JS · Chart.js · LocalStorage
   ========================================================== */

const STORAGE_KEY = "smartspend_transactions";

const CATEGORY_COLORS = {
  Food: "#f59e0b",
  Transport: "#3b82f6",
  Shopping: "#ec4899",
  Bills: "#ef4444",
  Entertainment: "#8b5cf6",
  Health: "#10b981",
  Education: "#06b6d4",
  Other: "#6b7280",
};

// ------------------------------------------------------------
// DOM references
// ------------------------------------------------------------
const expenseForm = document.getElementById("expenseForm");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const noteInput = document.getElementById("note");

const transactionBody = document.getElementById("transactionBody");
const transactionCountBadge = document.getElementById("transactionCountBadge");
const transactionsCard = document.querySelector(".transactions-card");

let categoryChart = null;
let weeklyChart = null;

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  dateInput.value = todayISO();
  document.getElementById("todayDate").textContent = formatFriendlyDate(new Date());

  expenseForm.addEventListener("submit", handleAddExpense);

  renderAll();
});

// ------------------------------------------------------------
// Storage helpers
// ------------------------------------------------------------
function getTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ------------------------------------------------------------
// CRUD
// ------------------------------------------------------------
function handleAddExpense(event) {
  event.preventDefault();

  const newTransaction = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    amount: parseFloat(amountInput.value),
    category: categoryInput.value,
    date: dateInput.value,
    note: noteInput.value.trim(),
  };

  const transactions = getTransactions();
  transactions.push(newTransaction);
  saveTransactions(transactions);

  expenseForm.reset();
  dateInput.value = todayISO();

  renderAll();
}

function deleteTransaction(id) {
  const transactions = getTransactions().filter((t) => t.id !== id);
  saveTransactions(transactions);
  renderAll();
}

// ------------------------------------------------------------
// Render orchestration
// ------------------------------------------------------------
function renderAll() {
  const transactions = getTransactions();
  renderTransactionTable(transactions);
  renderAnalytics(transactions);
  renderCategoryChart(transactions);
  renderWeeklyChart(transactions);
}

// ------------------------------------------------------------
// Transaction table
// ------------------------------------------------------------
function renderTransactionTable(transactions) {
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  transactionBody.innerHTML = "";

  sorted.forEach((t) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatShortDate(t.date)}</td>
      <td><span class="category-pill" style="background:${hexToRgba(CATEGORY_COLORS[t.category], 0.12)}; color:${CATEGORY_COLORS[t.category]}">${t.category}</span></td>
      <td>${escapeHtml(t.note) || "—"}</td>
      <td class="amount-cell">₹${t.amount.toFixed(2)}</td>
      <td><button class="delete-btn" data-id="${t.id}">Delete</button></td>
    `;
    transactionBody.appendChild(row);
  });

  transactionBody.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteTransaction(btn.dataset.id));
  });

  transactionCountBadge.textContent = `${transactions.length} item${transactions.length !== 1 ? "s" : ""}`;
  transactionsCard.classList.toggle("is-empty", transactions.length === 0);
}

// ------------------------------------------------------------
// Analytics calculations
// ------------------------------------------------------------
function renderAnalytics(transactions) {
  const total = sum(transactions.map((t) => t.amount));
  const count = transactions.length;

  document.getElementById("statTotal").textContent = `₹${total.toFixed(2)}`;
  document.getElementById("statCount").textContent = count;

  // Average spend per day (based on span of days with data)
  const avgPerDay = calculateAveragePerDay(transactions);
  document.getElementById("statAvgDay").textContent = `₹${avgPerDay.toFixed(2)}`;

  // Top category
  const topCategory = calculateTopCategory(transactions);
  document.getElementById("statTopCategory").textContent = topCategory ? topCategory : "—";

  // Largest transaction
  const largest = transactions.length ? Math.max(...transactions.map((t) => t.amount)) : 0;
  document.getElementById("statLargest").textContent = `₹${largest.toFixed(2)}`;

  // Weekly trend (this week vs last week)
  const { thisWeek, lastWeek } = calculateWeeklyTotals(transactions);
  document.getElementById("statWeekTrend").textContent = formatWeekTrend(thisWeek, lastWeek);

  // Monthly prediction
  const prediction = predictMonthlySpend(transactions);
  document.getElementById("statPrediction").textContent = `₹${prediction.toFixed(2)}`;
}

function calculateAveragePerDay(transactions) {
  if (transactions.length === 0) return 0;
  const dates = transactions.map((t) => new Date(t.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dayDiff = Math.max(1, Math.round((maxDate - minDate) / 86400000) + 1);
  const total = sum(transactions.map((t) => t.amount));
  return total / dayDiff;
}

function calculateTopCategory(transactions) {
  if (transactions.length === 0) return null;
  const totals = groupSumByCategory(transactions);
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
}

function groupSumByCategory(transactions) {
  const totals = {};
  transactions.forEach((t) => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return totals;
}

function calculateWeeklyTotals(transactions) {
  const now = new Date();
  const startOfThisWeek = startOfWeek(now);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  let thisWeek = 0;
  let lastWeek = 0;

  transactions.forEach((t) => {
    const d = new Date(t.date);
    if (d >= startOfThisWeek) {
      thisWeek += t.amount;
    } else if (d >= startOfLastWeek && d < startOfThisWeek) {
      lastWeek += t.amount;
    }
  });

  return { thisWeek, lastWeek };
}

function formatWeekTrend(thisWeek, lastWeek) {
  if (lastWeek === 0 && thisWeek === 0) return "—";
  if (lastWeek === 0) return `₹${thisWeek.toFixed(0)} (new)`;

  const change = ((thisWeek - lastWeek) / lastWeek) * 100;
  const arrow = change >= 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(change).toFixed(0)}%`;
}

// Simple trend-based monthly prediction:
// Uses average daily spend over the last 14 days (or however much data exists)
// and projects it across a 30-day month.
function predictMonthlySpend(transactions) {
  if (transactions.length === 0) return 0;

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 13); // last 14 days inclusive

  const recent = transactions.filter((t) => new Date(t.date) >= windowStart);
  const relevant = recent.length > 0 ? recent : transactions;

  const dates = relevant.map((t) => new Date(t.date).getTime());
  const span = Math.max(1, Math.round((Math.max(...dates) - Math.min(...dates)) / 86400000) + 1);
  const dailyAvg = sum(relevant.map((t) => t.amount)) / span;

  return dailyAvg * 30;
}

// ------------------------------------------------------------
// Charts
// ------------------------------------------------------------
function renderCategoryChart(transactions) {
  const chartCard = document.getElementById("categoryChart").closest(".chart-card");
  const totals = groupSumByCategory(transactions);
  const labels = Object.keys(totals);
  const data = Object.values(totals);

  chartCard.classList.toggle("is-empty", labels.length === 0);
  if (labels.length === 0) return;

  const colors = labels.map((cat) => CATEGORY_COLORS[cat] || "#6b7280");

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "pie",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11.5 } } },
      },
    },
  });
}

function renderWeeklyChart(transactions) {
  const chartCard = document.getElementById("weeklyChart").closest(".chart-card");
  chartCard.classList.toggle("is-empty", transactions.length === 0);
  if (transactions.length === 0) return;

  const last7Labels = [];
  const last7Data = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = toISODate(d);
    const dayTotal = sum(transactions.filter((t) => t.date === iso).map((t) => t.amount));
    last7Labels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
    last7Data.push(dayTotal);
  }

  if (weeklyChart) weeklyChart.destroy();

  weeklyChart = new Chart(document.getElementById("weeklyChart"), {
    type: "bar",
    data: {
      labels: last7Labels,
      datasets: [
        {
          label: "Spending",
          data: last7Data,
          backgroundColor: "#4f46e5",
          borderRadius: 6,
          maxBarThickness: 36,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "#f0f1f7" } },
        x: { grid: { display: false } },
      },
    },
  });
}

// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------
function sum(arr) {
  return arr.reduce((acc, val) => acc + val, 0);
}

function todayISO() {
  return toISODate(new Date());
}

function toISODate(date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().split("T")[0];
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatFriendlyDate(date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatShortDate(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(107,114,128,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}