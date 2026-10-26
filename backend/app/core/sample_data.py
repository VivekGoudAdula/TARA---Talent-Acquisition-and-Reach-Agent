"""Shared data generation helpers for seeding and sample data loading."""

from datetime import datetime, timezone
import random
import re

CITIES = ["Hyderabad", "Bengaluru", "Mumbai", "Delhi", "Chennai", "Pune"]
SOURCES = ["partner_referral", "web_form", "campaign", "app_signup"]
SEGMENTS = ["SALARIED_IT", "SALARIED_CORP", "SELF_EMPLOYED", "RETIRED", "STUDENT"]

FIRST_NAMES = [
    "Aarav", "Aditi", "Ananya", "Arjun", "Bhavya", "Chaitanya", "Deepak", "Divya",
    "Gaurav", "Harsha", "Ishaan", "Kavya", "Madhav", "Manish", "Meera", "Neha",
    "Nikhil", "Pooja", "Pranav", "Priya", "Rahul", "Rakesh", "Riya", "Rohan",
    "Sai", "Samarth", "Sandhya", "Sanjay", "Shreya", "Sneha", "Srikanth", "Suresh",
    "Tarun", "Varun", "Venkatesh", "Vijay", "Vikram", "Vinay", "Yamini", "Brijesh",
]

LAST_NAMES = [
    "Reddy", "Rao", "Sharma", "Verma", "Gupta", "Patel", "Kumar", "Iyer",
    "Nair", "Kulkarni", "Deshmukh", "Chowdary", "Naidu", "Joshi", "Mishra", "Yadav",
]


def slugify(text: str) -> str:
    """Convert a workspace name into a URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-") or "workspace"


def pick_language(city: str) -> str:
    """Skew language based on city (e.g. Telugu skewed towards Hyderabad)."""
    if city == "Hyderabad":
        return random.choices(["telugu", "hindi", "english"], weights=[0.65, 0.20, 0.15])[0]
    if city in ["Delhi", "Mumbai", "Pune"]:
        return random.choices(["hindi", "english", "telugu"], weights=[0.60, 0.35, 0.05])[0]
    return random.choices(["english", "hindi", "telugu"], weights=[0.50, 0.30, 0.20])[0]


def get_default_products(tenant_id: str) -> list[dict]:
    """Generate default 3 financial products for a tenant."""
    return [
        {
            "tenant_id": str(tenant_id),
            "name": "Personal Loan",
            "category": "lending",
            "description": "Unsecured personal loan up to ₹10L at competitive rates",
            "active": True,
            "eligibility_rules": {"min_income": 25000, "min_age": 21, "max_age": 60},
        },
        {
            "tenant_id": str(tenant_id),
            "name": "Credit Card",
            "category": "cards",
            "description": "Premium rewards credit card with dining and travel benefits",
            "active": True,
            "eligibility_rules": {"min_income": 30000, "min_age": 21, "max_age": 65},
        },
        {
            "tenant_id": str(tenant_id),
            "name": "Home Loan",
            "category": "mortgage",
            "description": "Affordable housing finance with long-term tenure up to 30 years",
            "active": True,
            "eligibility_rules": {"min_income": 60000, "min_age": 25, "max_age": 65},
        },
    ]


def generate_sample_leads(tenant_id: str, count: int = 40, verified_phones: list[str] | None = None) -> list[dict]:
    """Generate realistic Indian leads with non-dialable phone numbers."""
    leads = []
    verified_phones = verified_phones or []
    for i in range(1, count + 1):
        city = random.choice(CITIES)
        lang = pick_language(city)
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        phone = f"+9190000{str(i).zfill(5)}"

        if i <= len(verified_phones):
            phone = verified_phones[i - 1]
            name = f"Test User {i}"
            consent = True
            dnd = False
        else:
            consent = random.random() < 0.85
            dnd = random.random() < 0.08

        leads.append({
            "tenant_id": str(tenant_id),
            "name": name,
            "phone": phone,
            "language": lang,
            "city": city,
            "age": random.randint(22, 60),
            "income": round(random.uniform(18000, 180000), 2),
            "segment": random.choice(SEGMENTS),
            "consent": consent,
            "dnd": dnd,
            "source": random.choice(SOURCES),
            "attributes": {},
            "created_at": datetime.now(timezone.utc),
        })
    return leads


def generate_sample_customers(tenant_id: str, count: int = 20) -> list[dict]:
    """Generate realistic existing bank customers with financial metrics."""
    customers = []
    for i in range(101, 101 + count):
        city = random.choice(CITIES)
        lang = pick_language(city)
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        phone = f"+9190000{str(i).zfill(5)}"
        consent = random.random() < 0.90
        dnd = random.random() < 0.05

        customers.append({
            "tenant_id": str(tenant_id),
            "name": name,
            "phone": phone,
            "language": lang,
            "city": city,
            "age": random.randint(24, 65),
            "income": round(random.uniform(25000, 220000), 2),
            "segment": random.choice(SEGMENTS),
            "consent": consent,
            "dnd": dnd,
            "source": "crm_import",
            "attributes": {},
            "existing_products": random.sample(
                ["Savings Account", "Credit Card", "Fixed Deposit", "Auto Loan"],
                k=random.randint(1, 3),
            ),
            "repayment_behaviour": random.choices(["GOOD", "AVERAGE", "POOR"], weights=[0.8, 0.15, 0.05])[0],
            "financial_health": random.randint(55, 95),
            "created_at": datetime.now(timezone.utc),
        })
    return customers
