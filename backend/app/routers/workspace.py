"""Workspace router for tenant-level administrative operations."""

import logging
from typing import Any
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import build_tenant_query, get_db
from app.core.deps import require_role
from app.core.sample_data import generate_sample_customers, generate_sample_leads, get_default_products

logger = logging.getLogger("tara.workspace")
router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.post("/sample-data", status_code=status.HTTP_201_CREATED)
async def load_sample_data(
    current_user: dict[str, Any] = Depends(require_role("SUPER_ADMIN")),
) -> dict[str, Any]:
    """
    Populate caller's tenant with sample products, leads, and customers.
    Restricted to SUPER_ADMIN. Idempotent: returns 409 if data already exists.
    """
    db = get_db()
    tenant_id = current_user["tenant_id"]

    # Check if tenant already has leads or customers
    tenant_query = build_tenant_query(tenant_id)
    existing_leads = await db.leads.count_documents(tenant_query)
    existing_customers = await db.customers.count_documents(tenant_query)

    if existing_leads > 0 or existing_customers > 0:
        logger.warning("Sample data load rejected: workspace %s already has records", tenant_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sample data already loaded for this workspace",
        )

    # 1. Insert 3 default products
    products = get_default_products(tenant_id)
    if products:
        await db.products.insert_many(products)

    # 2. Insert 40 sample leads
    leads = generate_sample_leads(tenant_id, count=40)
    if leads:
        await db.leads.insert_many(leads)

    # 3. Insert 20 sample customers
    customers = generate_sample_customers(tenant_id, count=20)
    if customers:
        await db.customers.insert_many(customers)

    logger.info(
        "Loaded sample data for tenant %s: %d products, %d leads, %d customers",
        tenant_id,
        len(products),
        len(leads),
        len(customers),
    )
    return {
        "status": "success",
        "message": "Sample data loaded successfully",
        "counts": {
            "products": len(products),
            "leads": len(leads),
            "customers": len(customers),
        },
    }
