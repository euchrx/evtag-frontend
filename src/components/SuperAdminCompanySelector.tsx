import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type Company = {
  id: string;
  name: string;
  isActive: boolean;
};

export function SuperAdminCompanySelector() {
  const { user, selectedCompanyId, setSelectedCompanyId } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      return;
    }

    let isMounted = true;

    async function loadCompanies() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const { data } = await api.get<Company[]>('/companies');

        if (!isMounted) return;

        const activeCompanies = data.filter((company) => company.isActive);
        setCompanies(activeCompanies);

        if (!selectedCompanyId && activeCompanies.length > 0) {
          setSelectedCompanyId(activeCompanies[0].id);
        }
      } catch (error: any) {
        if (!isMounted) return;

        const message =
          error?.response?.data?.message || 'Não foi possível carregar as empresas.';

        setErrorMessage(Array.isArray(message) ? message.join(', ') : message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCompanies();

    return () => {
      isMounted = false;
    };
  }, [user, selectedCompanyId, setSelectedCompanyId]);

  if (user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="super-admin-company"
        className="text-xs font-medium uppercase tracking-wide text-slate-500"
      >
        Empresa ativa
      </label>

      <select
        id="super-admin-company"
        value={selectedCompanyId ?? ''}
        onChange={(event) => setSelectedCompanyId(event.target.value || null)}
        disabled={isLoading}
        className="min-w-[240px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <option value="">Selecione uma empresa</option>

        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>

      {errorMessage ? (
        <span className="text-xs text-red-600">{errorMessage}</span>
      ) : null}
    </div>
  );
}