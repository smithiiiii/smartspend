"""SmartSpend FastAPI backend."""

import sqlite3
from contextlib import asynccontextmanager, contextmanager
from datetime import date as date_type
from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator

from backend import ml_engine

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "smartspend.db"

ADVICE_BY_CATEGORY = {
    "Transport": (
        "consider carpooling, public transit passes, or combining trips to "
        "cut commuting costs"
    ),
    "Food & Dining": (
        "try meal prepping and limiting restaurant or delivery orders to "
        "a few times per week"
    ),
    "Groceries": (
        "plan meals around a weekly list and compare prices or buy in bulk "
        "to reduce waste"
    ),
    "Entertainment": (
        "review your subscriptions and set a monthly fun budget so "
        "leisure spending stays predictable"
    ),
    "Utilities": (
        "check for unused services, compare providers, and switch to "
        "energy-saving habits to lower recurring bills"
    ),
}

DEFAULT_ADVICE = (
    "review these purchases for avoidable expenses and set a monthly limit "
    "for this category"
)


@contextmanager
def get_connection():
    """Yield a SQLite connection that commits on success and always closes."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Create the transactions table if it does not exist."""
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL
            )
            """
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise the database and train the classifier on startup."""
    init_db()
    ml_engine.train_model()
    yield


app = FastAPI(title="SmartSpend API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TransactionCreate(BaseModel):
    """Payload for creating a transaction."""

    date: str
    description: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0)
    category: str | None = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        try:
            return date_type.fromisoformat(value.strip()).isoformat()
        except ValueError as exc:
            raise ValueError("date must be in YYYY-MM-DD format") from exc

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("description must not be blank")
        return value

    @field_validator("category")
    @classmethod
    def normalise_category(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


def build_insight(rows: list[dict]) -> dict:
    """Build a rule-assisted, two-sentence financial insight from records."""
    if not rows:
        return {
            "insight": (
                "No spending has been recorded yet. "
                "Add your first transactions to receive personalised "
                "recommendations."
            ),
            "total": 0.0,
            "top_category": None,
            "top_category_amount": 0.0,
        }

    df = pd.DataFrame(rows)
    total = float(df["amount"].sum())
    by_category = df.groupby("category")["amount"].sum().sort_values(ascending=False)
    top_category = str(by_category.index[0])
    top_amount = float(by_category.iloc[0])
    share = top_amount / total * 100 if total else 0.0

    advice = ADVICE_BY_CATEGORY.get(top_category, DEFAULT_ADVICE)
    saving = top_amount * 0.15

    first = (
        f"You have spent ₹{total:,.2f} in total, and {top_category} is your "
        f"biggest category at ₹{top_amount:,.2f} ({share:.0f}% of spending)."
    )
    if share >= 50:
        urgency = "That is over half of your budget, so"
    else:
        urgency = "To stay on track,"
    second = f"{urgency} {advice}; trimming it by 15% would save about ₹{saving:,.2f}."

    return {
        "insight": f"{first} {second}",
        "total": round(total, 2),
        "top_category": top_category,
        "top_category_amount": round(top_amount, 2),
    }


@app.get("/api/transactions")
def get_transactions() -> list[dict]:
    """Return all transactions, newest first."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, date, description, category, amount "
            "FROM transactions ORDER BY date DESC, id DESC"
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/transactions", status_code=201)
def create_transaction(payload: TransactionCreate) -> dict:
    """Store a transaction, auto-classifying the category when it is blank."""
    category = payload.category or ml_engine.predict_category(payload.description)
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO transactions (date, description, category, amount) "
            "VALUES (?, ?, ?, ?)",
            (payload.date, payload.description, category, payload.amount),
        )
        new_id = cursor.lastrowid
    return {
        "id": new_id,
        "date": payload.date,
        "description": payload.description,
        "category": category,
        "amount": payload.amount,
    }


@app.get("/api/ai-insights")
def get_ai_insights() -> dict:
    """Analyse stored transactions and return a spending recommendation."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, date, description, category, amount FROM transactions"
        ).fetchall()
    return build_insight([dict(row) for row in rows])


@app.get("/", include_in_schema=False)
def serve_index() -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")


@app.get("/script.js", include_in_schema=False)
def serve_script() -> FileResponse:
    return FileResponse(BASE_DIR / "script.js", media_type="application/javascript")


@app.get("/style.css", include_in_schema=False)
def serve_style() -> FileResponse:
    return FileResponse(BASE_DIR / "style.css", media_type="text/css")
