# SmartSpend — Personal Finance & Spending Analytics

**A modular personal finance application for transaction management, budget aggregation, and spending analytics, built with FastAPI, asynchronous SQLAlchemy, SQLite, and vanilla JavaScript.**

SmartSpend provides a lightweight web interface backed by a RESTful API for recording transactions and understanding spending patterns. Its architecture emphasizes modular backend services, efficient relational queries, asynchronous request handling, and INR-localized financial presentation without relying on heavyweight frontend frameworks.

## Core Capabilities

- **Transaction Management:** Organize financial transactions through a structured REST API backed by a relational database.
- **Spending Analytics:** Aggregate transaction data to support spending summaries, category-level breakdowns, and budget insights.
- **Asynchronous Backend:** Use FastAPI and asynchronous SQLAlchemy to structure database-backed request handling.
- **Database Efficiency:** Use relational queries and database-side aggregation to minimize unnecessary data transfer and application-side computation.
- **INR Localization:** Present monetary values using the Indian rupee symbol (₹) and appropriate localized formatting.
- **Lightweight Frontend:** Build a responsive interface with HTML5, CSS3, and vanilla JavaScript (ES6+), avoiding unnecessary framework overhead.
- **Interactive API Documentation:** Explore and test available endpoints through FastAPI's automatically generated Swagger UI.

## Architecture

```text
┌───────────────────────────────────────────┐
│           Client / Web Browser            │
│       HTML5 · CSS3 · Vanilla JS           │
└─────────────────────┬─────────────────────┘
                      │ HTTP / JSON
                      ▼
┌───────────────────────────────────────────┐
│               FastAPI Layer               │
│       Routing · Validation · HTTP         │
└─────────────────────┬─────────────────────┘
                      ▼
┌───────────────────────────────────────────┐
│            Application Services           │
│       Transaction Logic · Analytics       │
└─────────────────────┬─────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────┐
│        Async SQLAlchemy ORM Layer         │
│       Database Access · Query Logic       │
└─────────────────────┬─────────────────────┘
                      ▼
┌───────────────────────────────────────────┐
│                SQLite                     │
│       Transactions · Relational Data      │
└───────────────────────────────────────────┘
```

### Engineering Highlights

**Modular backend architecture**
- Separate HTTP routing, application logic, and persistence responsibilities.
- Use request validation and structured responses to maintain a predictable API boundary.
- Keep transaction operations and analytical computations independently maintainable.

**Database-aware analytics**
- Perform sums, counts, and category-level aggregations in SQL where appropriate.
- Retrieve only the columns and records required by each operation.
- Evaluate indexes against actual query patterns and query plans.
- Preserve transaction consistency through appropriate database transaction boundaries.

**Asynchronous request handling**
- Use FastAPI with asynchronous SQLAlchemy database operations.
- Keep database access compatible with the selected asynchronous SQLite driver.
- Avoid blocking I/O inside asynchronous request handlers.

**Responsive, localized frontend**
- Use vanilla JavaScript for API communication and dynamic interface updates.
- Format monetary values using `Intl.NumberFormat` with the `en-IN` locale and INR currency.
- Keep the interface lightweight while supporting desktop and mobile layouts.

## Technology Stack

| Layer | Technologies |
|---|---|
| Language | Python 3.11+ |
| API framework | FastAPI |
| ASGI server | Uvicorn |
| Database | SQLite |
| ORM and persistence | SQLAlchemy with asynchronous database access |
| Frontend | HTML5, CSS3, vanilla JavaScript (ES6+) |
| API communication | HTTP, REST, JSON |
| API documentation | OpenAPI, Swagger UI |
| Development | Python virtual environments, pip |

## API Specification

SmartSpend exposes a RESTful API for transaction management and spending analytics.

**Base URL:** `http://localhost:8000`

**Interactive documentation:** `http://localhost:8000/docs`

Swagger UI provides an interactive interface for inspecting available routes, reviewing request schemas, and submitting API requests against the running application.

### Endpoint Reference

The following is a representative API contract. Confirm the route names, HTTP methods, query parameters, and response schemas against the implemented application.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Application root or service information, if implemented |
| `GET` | `/docs` | Interactive Swagger API documentation |
| `GET` | `/openapi.json` | OpenAPI schema |
| `GET` | `/transactions` | Retrieve transactions, if implemented |
| `POST` | `/transactions` | Create a transaction, if implemented |
| `GET` | `/transactions/{id}` | Retrieve a transaction by ID, if implemented |
| `PUT` / `PATCH` | `/transactions/{id}` | Update a transaction, if implemented |
| `DELETE` | `/transactions/{id}` | Delete a transaction, if implemented |
| `GET` | `/analytics` | Retrieve spending summaries, if implemented |

### Example API Request

For an implementation exposing `POST /transactions`, a request might look like this:

```bash
curl -X POST http://localhost:8000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 450.00,
    "category": "Food",
    "description": "Lunch",
    "type": "expense"
  }'
```

The payload is illustrative; use the actual field names and validation rules defined by the application's request schema.

### INR Formatting

Financial values should be stored and processed consistently, with currency formatting handled at the presentation layer where appropriate.

Example in JavaScript:

```javascript
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

console.log(inrFormatter.format(1250));
// ₹1,250.00
```

For financial calculations, use a deliberate precision strategy rather than relying on repeated floating-point arithmetic. Integer paise or an appropriate decimal representation can help avoid rounding inconsistencies.

## Quickstart

### Prerequisites

- Python 3.11 or newer.
- Git.
- pip.

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/SmartSpend.git
cd SmartSpend
```

Replace `<your-username>` with your GitHub username.

### 2. Create a virtual environment

**Windows — PowerShell**

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

**Linux / macOS**

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

### 3. Install dependencies

If the repository contains a `requirements.txt` file:

```bash
pip install -r requirements.txt
```

If dependency installation is managed through `pyproject.toml` instead, use the installation procedure defined there.

### 4. Configure the application

Review the repository's configuration and environment-variable requirements. If a `.env.example` file exists, copy it to `.env` and configure the required values.

Do not commit secrets, credentials, or local environment files.

Ensure that the SQLite database path is configured correctly and that the application can create or access the database as required.

### 5. Launch the development server

If the FastAPI application object is exposed as `app` in `main.py`:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If the entry point is located elsewhere, replace `main:app` with the actual Python module and application object.

### 6. Explore the API

Once the server starts, open:

- **Swagger UI:** http://localhost:8000/docs
- **OpenAPI schema:** http://localhost:8000/openapi.json

Use Swagger UI to inspect the implemented endpoints and test requests interactively.

### 7. Run automated tests

If the project includes a pytest test suite:

```bash
python -m pip install pytest
python -m pytest -v
```

Run any additional test or database-initialization commands documented by the repository.

## Project Structure

The following is a recommended organization. Adapt it to the files and modules that actually exist in the repository.

```text
SmartSpend/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── api/
│   │   └── routes.py           # HTTP endpoints
│   ├── services/
│   │   └── analytics.py        # Spending and budget logic
│   ├── db/
│   │   ├── database.py         # Async database configuration
│   │   └── models.py           # SQLAlchemy models
│   └── schemas/
│       └── transactions.py     # Request and response schemas
├── static/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── templates/
│   └── index.html
├── tests/
│   ├── test_transactions.py
│   └── test_analytics.py
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

## Design Considerations

- **SQLite workload characteristics:** SQLite is suitable for lightweight applications and many single-instance workloads. Write concurrency and transaction behavior should be evaluated before assuming suitability for high-write, multi-instance deployments.
- **Asynchronous database access:** Async SQLAlchemy improves integration with asynchronous application code, but it does not automatically make SQLite queries faster. Measure the actual workload.
- **Query optimization:** Validate important queries with SQLite's `EXPLAIN QUERY PLAN` and use indexes where the observed query patterns justify them.
- **Financial correctness:** Define amount precision, transaction validation, and aggregation semantics consistently.
- **Security and input handling:** Validate request data, handle database errors safely, and avoid exposing internal exceptions in API responses.

## Roadmap

Potential future improvements include:

- Automated test coverage for transaction and analytics workflows.
- Database query-plan analysis and benchmark reporting.
- Exportable spending reports.
- Budget thresholds and spending alerts.
- Structured application logging and error monitoring.
- Database migrations and backup procedures.
- Authentication and authorization, if multi-user access is introduced.

## Project Goals

SmartSpend demonstrates practical backend engineering through asynchronous API development, relational persistence, query-aware analytics, financial data presentation, and lightweight frontend integration.

The emphasis is on maintainable architecture, predictable behavior, and measurable improvements rather than unnecessary framework complexity.

---

**Author:** [Smithika S](https://github.com/smithiiiii)

**Repository:** [SmartSpend](https://github.com/smithiiiii/SmartSpend)
