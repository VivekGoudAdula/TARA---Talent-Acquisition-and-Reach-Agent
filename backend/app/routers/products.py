"""Products router providing tenant-scoped financial product catalog."""

import logging
from typing import Any
from fastapi import APIRouter, Depends
from app.core.db import build_tenant_query, doc_to_dict, get_db
from app.core.deps import get_current_user
from app.schemas.product import ProductResponse

logger = logging.getLogger("tara.products")
router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductResponse])
async def list_products(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[ProductResponse]:
    """List financial products available for the authenticated user's tenant."""
    db = get_db()
    query = build_tenant_query(current_user["tenant_id"])

    cursor = db.products.find(query).sort("name", 1)
    items = []
    async for doc in cursor:
        items.append(ProductResponse(**doc_to_dict(doc)))

    logger.debug("Returned %d products for tenant %s", len(items), current_user["tenant_id"])
    return items
