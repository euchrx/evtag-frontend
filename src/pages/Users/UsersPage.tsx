import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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

export function UsersPage() {
  const { user } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');
  const [companyId, setCompanyId] = useState('');

  const canManageCompanies = user?.role === 'SUPER_ADMIN';
  const canManageUsers =
    user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';

  const availableRoles = useMemo<UserRole[]>(() => {
    if (user?.role === 'SUPER_ADMIN') {
      return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPERATOR'];
    }

    return ['COMPANY_ADMIN', 'OPERATOR'];
  }, [user]);

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
      setErrorMessage('');
      await Promise.all([loadUsers(), loadCompanies()]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Não foi possível carregar os usuários.';
      setErrorMessage(Array.isArray(message) ? message.join(', ') : message);
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

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setErrorMessage('');

      const payload: {
        name: string;
        email: string;
        password: string;
        role: UserRole;
        companyId?: string;
      } = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      };

      if (user?.role === 'SUPER_ADMIN') {
        if (role !== 'SUPER_ADMIN') {
          payload.companyId = companyId;
        }
      }

      await api.post('/users', payload);

      setName('');
      setEmail('');
      setPassword('');
      setRole(user?.role === 'SUPER_ADMIN' ? 'OPERATOR' : 'OPERATOR');
      setCompanyId(user?.role === 'COMPANY_ADMIN' ? user.companyId ?? '' : '');

      await loadUsers();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Não foi possível criar o usuário.';
      setErrorMessage(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleUserStatus(target: UserItem) {
    try {
      setErrorMessage('');

      await api.patch(`/users/${target.id}`, {
        isActive: !target.isActive,
      });

      await loadUsers();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Não foi possível atualizar o usuário.';
      setErrorMessage(Array.isArray(message) ? message.join(', ') : message);
    }
  }

  if (!canManageUsers) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Você não tem permissão para acessar a gestão de usuários.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Usuários</h2>
        <p className="mt-1 text-sm text-slate-600">
          Gerencie administradores e operadores do sistema.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">
            Novo usuário
          </h3>

          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nome</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="Nome do usuário"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="email@empresa.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Perfil</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
              >
                {availableRoles.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {canManageCompanies && role !== 'SUPER_ADMIN' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Empresa
                </label>
                <select
                  value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  required
                >
                  <option value="">Selecione uma empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-70"
            >
              {isSaving ? 'Salvando...' : 'Criar usuário'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              Lista de usuários
            </h3>
            {isLoading ? (
              <span className="text-sm text-slate-500">Carregando...</span>
            ) : null}
          </div>

          <div className="space-y-3">
            {users.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="text-sm text-slate-600">{item.email}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.role} • {item.company?.name || 'Sem empresa'} •{' '}
                    {item.isActive ? 'Ativo' : 'Inativo'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleUserStatus(item)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {item.isActive ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            ))}

            {!isLoading && users.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                Nenhum usuário encontrado.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}