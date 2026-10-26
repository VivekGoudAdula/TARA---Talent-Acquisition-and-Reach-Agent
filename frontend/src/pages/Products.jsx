import React, { useState, useEffect } from "react";
import { Package, RefreshCw, Sparkles } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import Button from "../components/Button";
import { formatCurrency } from "../utils/format";

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sampleLoading, setSampleLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/products");
      setProducts(data);
    } catch (err) {
      setError(err.message || "Failed to load product catalogue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleLoadSampleData = async () => {
    setSampleLoading(true);
    setError("");
    try {
      await api.post("/workspace/sample-data", {});
      await fetchProducts();
    } catch (err) {
      setError(err.message || "Could not load sample data.");
    } finally {
      setSampleLoading(false);
    }
  };

  const formatCategory = (cat) => {
    if (!cat) return "General";
    return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  };

  const columns = [
    {
      header: "Product Name",
      accessor: "name",
      className: "t-body-strong text-ink",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-strong border border-hairline flex items-center justify-center text-body shrink-0">
            <Package className="w-4 h-4 text-muted" />
          </div>
          <div>
            <div className="t-body-strong text-ink">{row.name}</div>
            <div className="t-caption text-muted">ID: {row.id}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      render: (row) => (
        <Badge variant="purple">
          {formatCategory(row.category)}
        </Badge>
      ),
    },
    {
      header: "Description",
      accessor: "description",
      className: "t-table text-body max-w-sm",
    },
    {
      header: "Eligibility Criteria",
      className: "whitespace-nowrap",
      render: (row) => (
        <div className="space-y-0.5 t-table whitespace-nowrap">
          <div className="text-body">
            Min Income:{" "}
            <span className="t-body-strong text-ink">
              {formatCurrency(row.eligibility_rules?.min_income)}
            </span>
          </div>
          <div className="text-muted t-caption">
            Age Band:{" "}
            <span>
              {row.eligibility_rules?.min_age}–{row.eligibility_rules?.max_age} yrs
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      render: (row) =>
        row.active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="default">Inactive</Badge>
        ),
    },
  ];

  const emptyActionBtn =
    user?.role === "SUPER_ADMIN" ? (
      <Button
        variant="primary"
        size="sm"
        onClick={handleLoadSampleData}
        disabled={sampleLoading}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>{sampleLoading ? "Loading..." : "Load sample data"}</span>
      </Button>
    ) : null;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="t-display-sm font-bold text-ink">Product Catalogue</h1>
          <p className="t-body-sm text-muted mt-1">
            Active financial products configured for borrower fit scoring and outreach campaigns.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchProducts}
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="p-3.5 rounded-md bg-red-50 border border-semantic-error/20 t-caption text-semantic-error">
          {error}
        </div>
      )}

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        emptyMessage="No financial products configured for this workspace."
        emptyAction={emptyActionBtn}
      />
    </div>
  );
}
