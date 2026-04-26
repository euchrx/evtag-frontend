import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Tags,
  Package,
  Printer,
  History,
  ScanLine,
  TabletSmartphone,
  Building2,
  Users,
  Menu,
  LogOut,
  Utensils,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SuperAdminCompanySelector } from '../components/SuperAdminCompanySelector';

type MenuItem = {
  label: string;
  path: string;
  icon: React.ElementType;
  adminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  { label: 'Controlados', path: '/dashboard', icon: BarChart3 },
  { label: 'Categorias', path: '/categories', icon: Tags },
  { label: 'Produtos', path: '/items', icon: Package },
  { label: 'Etiquetas', path: '/print', icon: Printer },
  { label: 'Histórico', path: '/history', icon: History },
  { label: 'Conferência', path: '/scan', icon: ScanLine },
  { label: 'Cozinha', path: '/kitchen', icon: Utensils },
  { label: 'Dispositivos', path: '/devices', icon: TabletSmartphone },
  { label: 'Empresas', path: '/companies', icon: Building2, adminOnly: true },
  { label: 'Usuários', path: '/users', icon: Users, adminOnly: true },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [showSidebarText, setShowSidebarText] = useState(true);

  const { user, logout } = useAuth();

  useEffect(() => {
    if (collapsed) {
      setShowSidebarText(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowSidebarText(true);
    }, 260);

    return () => window.clearTimeout(timeout);
  }, [collapsed]);

  function collapseSidebar() {
    setShowSidebarText(false);
    setCollapsed(true);
  }

  function expandSidebar() {
    setCollapsed(false);
  }

  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.adminOnly) return true;
    return user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';
  });

  return (
    <div className="min-h-screen bg-evtag-bg font-sans text-evtag-text">
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden bg-evtag-primary text-white transition-[width] duration-300 ease-out ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between px-5">
          {!collapsed ? (
            <>
              <div
                className={`min-w-0 overflow-hidden transition-opacity duration-150 ${
                  showSidebarText ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <h1 className="whitespace-nowrap font-display text-2xl font-black tracking-tight">
                  EvTag
                </h1>
              </div>

              <button
                type="button"
                onClick={collapseSidebar}
                className="shrink-0 rounded-xl bg-white/10 p-2 transition hover:bg-white/20"
                aria-label="Recolher menu"
              >
                <Menu size={18} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={expandSidebar}
              className="mx-auto rounded-2xl bg-white/10 p-3 transition hover:bg-white/20"
              aria-label="Expandir menu"
            >
              <Menu size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex h-12 items-center gap-3 rounded-2xl text-sm font-semibold transition-colors ${
                    collapsed ? 'justify-center px-0' : 'px-4'
                  } ${
                    isActive
                      ? 'bg-white text-evtag-primary shadow-lg'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={20} className="shrink-0" />

                {!collapsed ? (
                  <span
                    className={`min-w-0 truncate whitespace-nowrap transition-opacity duration-150 ${
                      showSidebarText ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    {item.label}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={logout}
            className={`flex h-12 w-full items-center gap-3 rounded-2xl text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white ${
              collapsed ? 'justify-center px-0' : 'px-4'
            }`}
          >
            <LogOut size={20} className="shrink-0" />

            {!collapsed ? (
              <span
                className={`whitespace-nowrap transition-opacity duration-150 ${
                  showSidebarText ? 'opacity-100' : 'opacity-0'
                }`}
              >
                Sair
              </span>
            ) : null}
          </button>
        </div>
      </aside>

      <main
        className={`min-h-screen transition-[padding-left] duration-300 ease-out ${
          collapsed ? 'pl-20' : 'pl-72'
        }`}
      >
        <header className="sticky top-0 z-30 border-b border-evtag-border/70 bg-evtag-bg/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-end gap-3 px-8">
            <SuperAdminCompanySelector compact />

            <div className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-evtag-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-evtag-light font-display text-sm font-black text-evtag-primary">
                {(user?.name?.[0] ?? 'U').toUpperCase()}
              </div>

              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-bold text-evtag-text">
                  {user?.name ?? 'Usuário'}
                </p>
                <p className="text-xs font-medium text-evtag-muted">
                  {formatRole(user?.role)}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function formatRole(role?: string) {
  const roles: Record<string, string> = {
    SUPER_ADMIN: 'Super admin',
    COMPANY_ADMIN: 'Administrador',
    OPERATOR: 'Operador',
  };

  return role ? roles[role] ?? role : '-';
}