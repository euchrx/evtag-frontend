import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type Company = {
  id: string;
  name: string;
  isActive: boolean;
};

type SuperAdminCompanySelectorProps = {
  compact?: boolean;
};

export function SuperAdminCompanySelector({
  compact = false,
}: SuperAdminCompanySelectorProps) {
  const { user, selectedCompanyId, setSelectedCompanyId } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      setCompanies([]);
      setErrorMessage('');
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
          error?.response?.data?.message ||
          'Não foi possível carregar as empresas.';

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
  }, [user?.role, setSelectedCompanyId]);

  function handleChange(companyId: string) {
    setSelectedCompanyId(companyId || null);

    // força as páginas dependentes a recarregarem com novo escopo
    window.dispatchEvent(
      new CustomEvent('evtag:company-scope-changed', {
        detail: { companyId: companyId || null },
      }),
    );
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {!compact ? (
        <label
          htmlFor="super-admin-company"
          className="text-xs font-bold uppercase tracking-wide text-evtag-muted"
        >
          Empresa ativa
        </label>
      ) : null}

      <select
        id="super-admin-company"
        value={selectedCompanyId ?? ''}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isLoading}
        className="h-10 min-w-[220px] rounded-full border border-evtag-border bg-white px-4 text-sm font-medium text-evtag-text outline-none transition focus:border-evtag-primary disabled:cursor-not-allowed disabled:opacity-70"
      >
        <option value="">Selecionar empresa</option>

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