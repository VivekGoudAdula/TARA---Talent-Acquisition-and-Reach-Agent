import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute, { PublicAuthRoute } from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Leads from "./pages/Leads";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import ProductMatches from "./pages/ProductMatches";
import Models from "./pages/Models";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<Landing />} />

          {/* Public Auth Routes (Redirects to /app if already logged in) */}
          <Route element={<PublicAuthRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* Protected App Routes */}
          <Route path="/app" element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/app/leads" replace />} />
              <Route path="leads" element={<Leads />} />
              <Route path="customers" element={<Customers />} />
              <Route path="matches" element={<ProductMatches />} />
              <Route path="products" element={<Products />} />
              <Route path="models" element={<Models />} />
            </Route>
          </Route>

          {/* Catch-all 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
