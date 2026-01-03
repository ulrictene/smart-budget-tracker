import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../src/pages/login";
import DashboardPage from "../src/pages/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import CategoriesPage from "./pages/Categories";
import TransactionsPage from "./pages/Transactions";


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
         path="/categories"
         element={
         <ProtectedRoute>
         <CategoriesPage />
        </ProtectedRoute>
  }
/>
<Route
  path="/transactions"
  element={
    <ProtectedRoute>
      <TransactionsPage />
    </ProtectedRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

