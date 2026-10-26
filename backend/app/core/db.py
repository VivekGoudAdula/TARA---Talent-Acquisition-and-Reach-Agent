"""MongoDB connection, index initialization, and tenant isolation helpers."""

import logging
from typing import Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("tara.db")

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


def get_db() -> AsyncIOMotorDatabase:
    """Return the active MongoDB database instance."""
    if db is None:
        raise RuntimeError("Database not initialized. Call init_db first.")
    return db


async def init_db() -> None:
    """Initialize MongoDB client and create necessary indexes."""
    global client, db
    logger.info("Connecting to MongoDB at %s", settings.mongo_uri.split("@")[-1])
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db_name]

    # Verify connection
    await client.admin.command("ping")

    # Ensure required indexes
    await db.users.create_index("email", unique=True)
    await db.tenants.create_index("slug", unique=True)

    await db.leads.create_index([("tenant_id", 1), ("phone", 1)])
    await db.leads.create_index([("tenant_id", 1), ("language", 1)])
    await db.leads.create_index([("tenant_id", 1), ("consent", 1)])
    await db.leads.create_index([("tenant_id", 1), ("dnd", 1)])

    await db.customers.create_index([("tenant_id", 1), ("phone", 1)])
    await db.customers.create_index([("tenant_id", 1), ("language", 1)])
    await db.customers.create_index([("tenant_id", 1), ("consent", 1)])
    await db.customers.create_index([("tenant_id", 1), ("dnd", 1)])

    await db.products.create_index([("tenant_id", 1), ("active", 1)])
    logger.info("MongoDB initialized and indexes verified successfully.")


async def close_db() -> None:
    """Close MongoDB client connection."""
    global client
    if client is not None:
        client.close()
        logger.info("MongoDB connection closed.")


def build_tenant_query(tenant_id: str, extra_query: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Enforce tenant scoping on all database queries.

    Accepts tenant_id and optional additional query criteria.
    Matches either string or ObjectId representation for robust backward compatibility.
    """
    clean_tenant_id = str(tenant_id).strip()
    tenant_matcher: Any = clean_tenant_id
    if ObjectId.is_valid(clean_tenant_id):
        tenant_matcher = {"$in": [clean_tenant_id, ObjectId(clean_tenant_id)]}

    base_query: dict[str, Any] = {"tenant_id": tenant_matcher}

    if not extra_query:
        return base_query

    # Combine queries safely
    combined_query: dict[str, Any] = {**base_query}
    for key, val in extra_query.items():
        if key == "tenant_id":
            # Never allow caller to override tenant_id
            continue
        combined_query[key] = val

    return combined_query


def doc_to_dict(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    """Convert MongoDB document ObjectId fields to strings for serialization."""
    if doc is None:
        return None
    res = dict(doc)
    if "_id" in res:
        res["id"] = str(res.pop("_id"))
    if "tenant_id" in res and isinstance(res["tenant_id"], ObjectId):
        res["tenant_id"] = str(res["tenant_id"])
    return res
