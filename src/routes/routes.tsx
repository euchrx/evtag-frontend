import { Route, Routes, Navigate } from 'react-router-dom';
import { AppLayout } from './../layouts/AppLayout';

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

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/items" element={<ItemsPage />} />
        <Route path="/print" element={<PrintPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}