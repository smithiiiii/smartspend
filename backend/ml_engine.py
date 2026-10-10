"""Expense classification engine using TF-IDF + Logistic Regression."""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

CATEGORIES = ["Transport", "Food & Dining", "Groceries", "Entertainment", "Utilities"]

SEED_DATA = {
    "Transport": [
        "uber ride to office",
        "ola cab",
        "lyft ride downtown",
        "metro card recharge",
        "bus ticket",
        "train ticket",
        "petrol",
        "gas station fuel",
        "diesel refill",
        "parking fee",
        "toll plaza charge",
        "taxi fare airport",
        "auto rickshaw",
        "flight ticket",
        "car service and repair",
        "bike fuel",
        "rapido bike taxi",
        "subway pass",
        "ferry ticket",
        "vehicle insurance renewal",
    ],
    "Food & Dining": [
        "starbucks",
        "starbucks coffee",
        "mcdonalds burger",
        "dominos pizza",
        "pizza hut dinner",
        "kfc chicken bucket",
        "restaurant dinner",
        "lunch at cafe",
        "swiggy order",
        "zomato food delivery",
        "doordash order",
        "ubereats meal",
        "subway sandwich",
        "burger king",
        "biryani takeaway",
        "chai and snacks",
        "ice cream parlor",
        "bakery pastry",
        "breakfast at diner",
        "sushi restaurant",
    ],
    "Groceries": [
        "walmart groceries",
        "supermarket",
        "bigbasket order",
        "grofers vegetables",
        "fruits and vegetables",
        "milk and eggs",
        "whole foods market",
        "costco bulk purchase",
        "kroger grocery run",
        "reliance fresh",
        "dmart monthly shopping",
        "rice and flour",
        "tesco groceries",
        "aldi weekly shop",
        "butcher meat purchase",
        "vegetable market",
        "instamart groceries",
        "blinkit grocery delivery",
        "bread butter and cheese",
        "household provisions",
    ],
    "Entertainment": [
        "netflix subscription",
        "spotify premium",
        "movie tickets",
        "cinema popcorn",
        "amazon prime video",
        "disney plus",
        "concert tickets",
        "playstation game",
        "steam game purchase",
        "xbox game pass",
        "youtube premium",
        "bowling night",
        "theme park entry",
        "comic books",
        "karaoke night",
        "hotstar subscription",
        "museum entry",
        "nightclub cover charge",
        "board game cafe",
        "arcade games",
    ],
    "Utilities": [
        "electricity bill",
        "water bill",
        "internet bill",
        "wifi broadband payment",
        "mobile phone recharge",
        "gas cylinder",
        "cooking gas bill",
        "airtel postpaid",
        "jio recharge",
        "verizon phone bill",
        "sewage and waste charges",
        "power utility payment",
        "cable tv bill",
        "dth recharge",
        "comcast internet",
        "maintenance charges apartment",
        "property tax",
        "heating bill",
        "trash collection fee",
        "landline bill",
    ],
}

_model: Pipeline | None = None


def build_training_set() -> tuple[list[str], list[str]]:
    """Flatten the seed data into parallel lists of texts and labels."""
    texts: list[str] = []
    labels: list[str] = []
    for category, examples in SEED_DATA.items():
        for example in examples:
            texts.append(example)
            labels.append(category)
    return texts, labels


def train_model() -> Pipeline:
    """Train the TF-IDF + Logistic Regression pipeline and cache it."""
    global _model
    texts, labels = build_training_set()
    pipeline = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    analyzer="char_wb",
                    ngram_range=(2, 4),
                    sublinear_tf=True,
                ),
            ),
            ("clf", LogisticRegression(C=10.0, max_iter=1000)),
        ]
    )
    pipeline.fit(texts, labels)
    _model = pipeline
    return pipeline


def _get_model() -> Pipeline:
    if _model is None:
        return train_model()
    return _model


def predict_category(description: str) -> str:
    """Predict the expense category for a raw text description."""
    cleaned = description.strip()
    if not cleaned:
        raise ValueError("Description must not be empty.")
    return str(_get_model().predict([cleaned])[0])


def predict_with_confidence(description: str) -> tuple[str, float]:
    """Predict the category and return it along with its probability."""
    cleaned = description.strip()
    if not cleaned:
        raise ValueError("Description must not be empty.")
    model = _get_model()
    probabilities = model.predict_proba([cleaned])[0]
    best_index = int(probabilities.argmax())
    return str(model.classes_[best_index]), float(probabilities[best_index])


def predict_categories(descriptions: list[str]) -> list[str]:
    """Predict categories for several descriptions at once."""
    return [predict_category(text) for text in descriptions]
