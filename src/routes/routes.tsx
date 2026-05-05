import { Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from './../layouts/AppLayout';

import { ProtectedRoute } from './ProtectedRoute';

import { LoginPage } from './../pages/Login/LoginPage';
import { AdminPage } from './../pages/Admin/AdminPage';
import { DashboardPage } from './../pages/Dashboard/DashboardPage';
import { CategoriesPage } from './../pages/Categories/CategoriesPage';
import { ItemsPage } from './../pages/Items/ItemsPage';
import { PrintPage } from './../pages/Print/PrintPage';
import { HistoryPage } from './../pages/History/HistoryPage';
import { ScanPage } from './../pages/Scan/ScanPage';
import { KitchenPage } from './../pages/Kitchen/KitchenPage';
import { DevicesPage } from './../pages/Devices/DevicesPage';
import { CompaniesPage } from './../pages/Companies/CompaniesPage';
import { UsersPage } from './../pages/Users/UsersPage';
import { useAuth } from './../contexts/AuthContext';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/kitchen" element={<KitchenPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRedirect />} />

          <Route element={<SuperAdminOnlyRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="/companies" element={<CompaniesPage />} />

          <Route element={<CompanyScopedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/print" element={<PrintPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function HomeRedirect() {
  const { user, selectedCompanyId } = useAuth();

  if (user?.role === 'SUPER_ADMIN' && !selectedCompanyId) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function SuperAdminOnlyRoute() {
  const { user } = useAuth();

  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function CompanyScopedRoute() {
  const { user, selectedCompanyId } = useAuth();

  if (user?.role === 'SUPER_ADMIN' && !selectedCompanyId) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}