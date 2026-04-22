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

type Tab =
  | 'dashboard'
  | 'categories'
  | 'items'
  | 'print'
  | 'history'
  | 'scan'
  | 'companies'
  | 'users';

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
              Como SUPER_ADMIN, você precisa escolher uma empresa para acessar
              dashboard, categorias, itens, impressão, histórico e conferência.
            </p>
          </div>

          <div className="space-y-4">
            <SuperAdminCompanySelector />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              O sistema enviará automaticamente o contexto da empresa nas
              requisições após a seleção.
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTab('companies')}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Gerenciar empresas
              </button>

              <button
                type="button"
                onClick={() => setTab('users')}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Gerenciar usuários
              </button>

              <button
                type="button"
                onClick={logout}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
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
                type="button"
                onClick={logout}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Sair
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('dashboard')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === 'dashboard'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => setTab('categories')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === 'categories'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Categorias
            </button>

            <button
              type="button"
              onClick={() => setTab('items')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === 'items'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Itens
            </button>

            <button
              type="button"
              onClick={() => setTab('print')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === 'print'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Impressão
            </button>

            <button
              type="button"
              onClick={() => setTab('history')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === 'history'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Histórico
            </button>

            <button
              type="button"
              onClick={() => setTab('scan')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === 'scan'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Conferência
            </button>

            {user?.role === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={() => setTab('companies')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab === 'companies'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Empresas
              </button>
            )}

            {(user?.role === 'SUPER_ADMIN' ||
              user?.role === 'COMPANY_ADMIN') && (
              <button
                type="button"
                onClick={() => setTab('users')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab === 'users'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Usuários
              </button>
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
      </main>
    </div>
  );
}

export default App;