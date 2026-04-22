import { useMemo, useState } from 'react';
import { CategoriesPage } from './pages/Categories/CategoriesPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { HistoryPage } from './pages/History/HistoryPage';
import { ItemsPage } from './pages/Items/ItemsPage';
import { PrintPage } from './pages/Print/PrintPage';
import { ScanPage } from './pages/Scan/ScanPage';
import { LoginPage } from './pages/Login/LoginPage';
import { useAuth } from './contexts/AuthContext';
import { SuperAdminCompanySelector } from './components/SuperAdminCompanySelector';
import { CompaniesPage } from './pages/Companies/CompaniesPage';
import { UsersPage } from './pages/Users/UsersPage';
import { KitchenPage } from './pages/Kitchen/KitchenPage';
import { DevicesPage } from './pages/Devices/DevicesPage';

type Tab =
  | 'dashboard'
  | 'categories'
  | 'items'
  | 'print'
  | 'history'
  | 'scan'
  | 'companies'
  | 'users'
  | 'devices'
  | 'kitchen';

function App() {
  const {
    isAuthenticated,
    isLoading,
    user,
    logout,
    selectedCompanyId,
  } = useAuth();

  const [tab, setTab] = useState<Tab>('dashboard');

  const companyLabel = useMemo(() => {
    if (!user) return '';

    if (user.role === 'SUPER_ADMIN') {
      return selectedCompanyId ? 'Empresa selecionada' : 'Super Admin';
    }

    return user.company?.name || 'Empresa';
  }, [user, selectedCompanyId]);

  // 🔥 ROTA DIRETA
  const path = window.location.pathname;

  if (path === '/kitchen') {
    return <KitchenPage />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          Carregando...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const mustSelectCompany =
    user?.role === 'SUPER_ADMIN' &&
    !selectedCompanyId &&
    tab !== 'companies' &&
    tab !== 'users';

  if (mustSelectCompany) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Selecione uma empresa
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Como SUPER_ADMIN, você precisa escolher uma empresa.
            </p>
          </div>

          <div className="space-y-4">
            <SuperAdminCompanySelector />

            <div className="flex gap-3">
              <button
                onClick={() => setTab('companies')}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Empresas
              </button>

              <button
                onClick={() => setTab('users')}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Usuários
              </button>

              <button
                onClick={logout}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">EvTag</h1>
              <p className="text-sm text-slate-600">
                Etiquetagem inteligente para restaurante
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
                <div className="font-medium text-slate-900">{user?.name}</div>
                <div className="text-slate-600">
                  {companyLabel} • {user?.role}
                </div>
              </div>

              <SuperAdminCompanySelector />

              <button
                onClick={logout}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
              >
                Sair
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <TabBtn tab={tab} setTab={setTab} value="dashboard">Dashboard</TabBtn>
            <TabBtn tab={tab} setTab={setTab} value="categories">Categorias</TabBtn>
            <TabBtn tab={tab} setTab={setTab} value="items">Itens</TabBtn>
            <TabBtn tab={tab} setTab={setTab} value="print">Impressão</TabBtn>
            <TabBtn tab={tab} setTab={setTab} value="history">Histórico</TabBtn>
            <TabBtn tab={tab} setTab={setTab} value="scan">Conferência</TabBtn>
            <TabBtn tab={tab} setTab={setTab} value="devices">Dispositivos</TabBtn>

            {user?.role === 'SUPER_ADMIN' && (
              <TabBtn tab={tab} setTab={setTab} value="companies">
                Empresas
              </TabBtn>
            )}

            {(user?.role === 'SUPER_ADMIN' ||
              user?.role === 'COMPANY_ADMIN') && (
              <TabBtn tab={tab} setTab={setTab} value="users">
                Usuários
              </TabBtn>
            )}
          </div>
        </div>
      </header>

      <main>
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'categories' && <CategoriesPage />}
        {tab === 'items' && <ItemsPage />}
        {tab === 'print' && <PrintPage />}
        {tab === 'history' && <HistoryPage />}
        {tab === 'scan' && <ScanPage />}
        {tab === 'companies' && <CompaniesPage />}
        {tab === 'users' && <UsersPage />}
        {tab === 'devices' && <DevicesPage />}
      </main>
    </div>
  );
}

function TabBtn({ tab, setTab, value, children }: any) {
  return (
    <button
      onClick={() => setTab(value)}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        tab === value
          ? 'bg-slate-900 text-white'
          : 'bg-slate-200 text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

export default App;