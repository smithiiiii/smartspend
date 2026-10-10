"use strict";

const API_BASE = "http://127.0.0.1:8000/api";

const CATEGORY_COLORS = {
  Transport: "#38bdf8",
  "Food & Dining": "#f472b6",
  Groceries: "#4ade80",
  Entertainment: "#c084fc",
  Utilities: "#fbbf24",
};
const FALLBACK_COLORS = ["#fb7185", "#2dd4bf", "#a3e635", "#f97316", "#818cf8"];

let transactions = [];
let categoryChart = null;

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const el = (id) => document.getElementById(id);

function colorFor(category, index) {
  return (
    CATEGORY_COLORS[category] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  );
}

function showMessage(text, isError = false) {
  const box = el("form-message");
  box.textContent = text;
  box.className = isError ? "form-message error" : "form-message success";
}

function computeCategoryTotals() {
  const totals = {};
  transactions.forEach((t) => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return totals;
}

function renderTable() {
  const tbody = el("transactions-body");
  tbody.innerHTML = "";

  if (transactions.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty";
    cell.textContent = "No transactions yet. Add your first one!";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  transactions.forEach((t) => {
    const row = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = t.date;

    const descCell = document.createElement("td");
    descCell.textContent = t.description;

    const catCell = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = t.category;
    pill.style.setProperty(
      "--pill-color",
      CATEGORY_COLORS[t.category] || "#94a3b8",
    );
    catCell.appendChild(pill);

    const amountCell = document.createElement("td");
    amountCell.className = "num";
    amountCell.textContent = formatCurrency(t.amount);

    row.append(dateCell, descCell, catCell, amountCell);
    tbody.appendChild(row);
  });
}

function renderStats() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  el("total-spending").textContent = formatCurrency(total);
  el("transaction-count").textContent =
    `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;

  const totals = computeCategoryTotals();
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (entries.length > 0) {
    el("top-category").textContent = entries[0][0];
    el("top-category-amount").textContent = formatCurrency(entries[0][1]);
  } else {
    el("top-category").textContent = "—";
    el("top-category-amount").textContent = formatCurrency(0);
  }
}

function renderChart() {
  const totals = computeCategoryTotals();
  const labels = Object.keys(totals);
  const data = labels.map((label) => Number(totals[label].toFixed(2)));
  const colors = labels.map((label, i) => colorFor(label, i));
  const canvas = el("category-chart");

  if (categoryChart) {
    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = data;
    categoryChart.data.datasets[0].backgroundColor = colors;
    categoryChart.update();
    return;
  }

  categoryChart = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: "rgba(15, 23, 42, 0.8)",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#e2e8f0", padding: 16 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

function renderAll() {
  renderTable();
  renderStats();
  renderChart();
}

async function loadTransactions() {
  try {
    const response = await fetch(`${API_BASE}/transactions`);
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    transactions = await response.json();
    renderAll();
  } catch (error) {
    console.error("Failed to load transactions:", error);
    const tbody = el("transactions-body");
    tbody.innerHTML = "";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty";
    cell.textContent = "Could not reach the server. Is the backend running?";
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

async function addTransaction(payload) {
  const response = await fetch(`${API_BASE}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `Server responded with ${response.status}`;
    try {
      const body = await response.json();
      if (Array.isArray(body.detail) && body.detail.length > 0) {
        detail = body.detail[0].msg;
      } else if (typeof body.detail === "string") {
        detail = body.detail;
      }
    } catch (_) {
      /* keep default message */
    }
    throw new Error(detail);
  }

  const created = await response.json();
  await loadTransactions();
  await loadAIInsights();
  return created;
}

async function loadAIInsights() {
  const box = el("ai-insights-box");
  try {
    const response = await fetch(`${API_BASE}/ai-insights`);
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    const data = await response.json();
    box.textContent = data.insight;
  } catch (error) {
    console.error("Failed to load AI insights:", error);
    box.textContent = "AI insights are unavailable right now.";
  }
}

function setupForm() {
  const form = el("transaction-form");
  const submitBtn = el("submit-btn");

  el("date").value = new Date().toISOString().slice(0, 10);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("");

    const payload = {
      date: el("date").value,
      description: el("description").value.trim(),
      amount: parseFloat(el("amount").value),
      category: el("category").value || null,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";

    try {
      const created = await addTransaction(payload);
      showMessage(`Added to ${created.category}.`);
      el("description").value = "";
      el("amount").value = "";
      el("category").value = "";
      el("description").focus();
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add Transaction";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupForm();
  loadTransactions();
  loadAIInsights();
});