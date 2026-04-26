import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'OPERATOR';

type Company = {
  id: string;
  name: string;
  isActive: boolean;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string | null;
  isActive: boolean;
  company?: Company | null;
};

type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  companyId?: string;
};

type SelectOption = {
  value: string;
  label: string;
};

function getRoleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super admin',
    COMPANY_ADMIN: 'Administrador',
    OPERATOR: 'Operador',
  };

  return labels[role];
}

export function UsersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [companyId, setCompanyId] = useState('');

  const canManageCompanies = user?.role === 'SUPER_ADMIN';
  const canManageUsers =
    user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';

  const availableRoles = useMemo<UserRole[]>((() => {
    if (user?.role === 'SUPER_ADMIN') {
      return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPERATOR'];
    }

    return ['COMPANY_ADMIN', 'OPERATOR'];
  }) as never, [user?.role]);

  async function loadUsers() {
    const { data } = await api.get<UserItem[]>('/users');
    setUsers(data);
  }

  async function loadCompanies() {
    if (!canManageCompanies) return;

    const { data } = await api.get<Company[]>('/companies');
    setCompanies(data.filter((company) => company.isActive));
  }

  async function bootstrap() {
    try {
      setIsLoading(true);
      await Promise.all([loadUsers(), loadCompanies()]);
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao carregar usuários'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!canManageUsers) return;
    void bootstrap();
  }, [canManageUsers, canManageCompanies]);

  useEffect(() => {
    if (user?.role === 'COMPANY_ADMIN') {
      setRole('OPERATOR');
      setCompanyId(user.companyId ?? '');
    }
  }, [user]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password.trim()) {
      showToast('Preencha nome, e-mail e senha.', 'warning');
      return;
    }

    if (user?.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN' && !companyId) {
      showToast('Selecione uma empresa para este usuário.', 'warning');
      return;
    }

    try {
      setIsSaving(true);

      const payload: CreateUserPayload = {
        name: trimmedName,
        email: trimmedEmail,
        password,
        role,
      };

      if (user?.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
        payload.companyId = companyId;
      }

      await api.post('/users', payload);

      setName('');
      setEmail('');
      setPassword('');
      setRole('OPERATOR');
      setCompanyId(user?.role === 'COMPANY_ADMIN' ? user.companyId ?? '' : '');

      await loadUsers();

      showToast('Usuário criado com sucesso.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao criar usuário'), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleUserStatus(target: UserItem) {
    try {
      setUpdatingId(target.id);

      await api.patch(`/users/${target.id}`, {
        isActive: !target.isActive,
      });

      await loadUsers();

      showToast('Status atualizado com sucesso.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao atualizar usuário'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  const activeUsers = useMemo(
    () => users.filter((item) => item.isActive).length,
    [users],
  );

  const adminUsers = useMemo(
    () =>
      users.filter(
        (item) => item.role === 'SUPER_ADMIN' || item.role === 'COMPANY_ADMIN',
      ).length,
    [users],
  );

  if (!canManageUsers) {
    return (
      <div className="space-y-8 font-sans">
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-5 text-sm font-bold text-amber-800">
          Você não tem permissão para acessar usuários.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        isLoading={isLoading}
        onRefresh={bootstrap}
        total={users.length}
        active={activeUsers}
        admins={adminUsers}
      />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                Cadastro
              </div>

              <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                Novo usuário
              </h2>

              <p className="mt-2 text-sm leading-6 text-evtag-muted">
                Cadastre usuários e defina o perfil de acesso à operação.
              </p>
            </div>

            <div className="rounded-2xl bg-evtag-primary p-3 text-white">
              <UserPlus size={22} />
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            <Input label="Nome" value={name} onChange={setName} />

            <Input
              label="E-mail"
              value={email}
              onChange={setEmail}
              type="email"
            />

            <Input
              label="Senha"
              value={password}
              onChange={setPassword}
              type="password"
            />

            <Select
              label="Perfil"
              value={role}
              onChange={(value) => setRole(value as UserRole)}
              options={availableRoles.map((itemRole) => ({
                value: itemRole,
                label: getRoleLabel(itemRole),
              }))}
            />

            {canManageCompanies && role !== 'SUPER_ADMIN' ? (
              <Select
                label="Empresa"
                value={companyId}
                onChange={setCompanyId}
                options={companies.map((company) => ({
                  value: company.id,
                  label: company.name,
                }))}
              />
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus size={17} />
              {isSaving ? 'Salvando...' : 'Criar usuário'}
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-evtag-border bg-white shadow-sm">
          <div className="border-b border-evtag-border px-6 py-5">
            <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
              Usuários
            </div>

            <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
              Lista de usuários
            </h2>

            <p className="mt-1 text-sm text-evtag-muted">
              {users.length} usuário(s) encontrado(s)
            </p>
          </div>

          {isLoading ? (
            <EmptyMessage message="Carregando usuários..." />
          ) : users.length === 0 ? (
            <EmptyMessage message="Nenhum usuário encontrado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-evtag-border text-sm">
                <thead className="bg-evtag-light/60">
                  <tr>
                    <TableHead>Usuário</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead align="right">Ações</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-evtag-border bg-white">
                  {users.map((item) => {
                    const isBusy = updatingId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-evtag-light/50"
                      >
                        <td className="max-w-[260px] px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-evtag-light text-evtag-primary">
                              <Users size={18} />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-evtag-text">
                                {item.name}
                              </p>
                              <p className="mt-0.5 text-xs text-evtag-muted">
                                Acesso do sistema
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-medium text-evtag-muted">
                          {item.email}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <RoleBadge role={item.role} />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-medium text-evtag-muted">
                          {item.company?.name || '-'}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <ActiveBadge isActive={item.isActive} />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => void toggleUserStatus(item)}
                            disabled={isBusy}
                            className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              item.isActive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {isBusy
                              ? 'Salvando...'
                              : item.isActive
                                ? 'Desativar'
                                : 'Ativar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PageHeader({
  isLoading,
  onRefresh,
  total,
  active,
  admins,
}: {
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  total: number;
  active: number;
  admins: number;
}) {
  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-evtag-text">
          Usuários
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-evtag-muted">
          Gerencie acessos, permissões e vínculos de usuários por empresa.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <HeaderStat label="Total" value={total} />
        <HeaderStat label="Ativos" value={active} />
        <HeaderStat label="Admins" value={admins} />

        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={isLoading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>
    </header>
  );
}

function HeaderStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex h-12 min-w-[104px] items-center rounded-2xl bg-white px-4 shadow-sm ring-1 ring-evtag-border">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-evtag-muted">
          {label}
        </p>

        <p className="font-display text-xl font-black leading-none text-evtag-primary">
          {value}
        </p>
      </div>
    </div>
  );
}

function TableHead({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const alignClass = align === 'right' ? 'text-right' : 'text-left';

  return (
    <th
      className={`whitespace-nowrap px-5 py-4 ${alignClass} text-xs font-black uppercase tracking-wide text-evtag-muted`}
    >
      {children}
    </th>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-slate-100 text-slate-700 ring-slate-200'
      }`}
    >
      {isActive ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const classMap: Record<UserRole, string> = {
    SUPER_ADMIN: 'bg-purple-50 text-purple-700 ring-purple-200',
    COMPANY_ADMIN: 'bg-blue-50 text-blue-700 ring-blue-200',
    OPERATOR: 'bg-slate-100 text-slate-700 ring-slate-200',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${classMap[role]}`}
    >
      {getRoleLabel(role)}
    </span>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
};

function Input({ label, value, onChange, type = 'text' }: InputProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-evtag-text">{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
      />
    </label>
  );
}

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
};

function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-evtag-text">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
      >
        <option value="">Selecione</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-evtag-muted">
      {message}
    </div>
  );
}