import { useEffect, useMemo, useState } from 'react';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type Company = {
  id: string;
  name: string;
  isActive: boolean;
};

export function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { showToast } = useToast();

  async function load() {
    try {
      setIsLoading(true);

      const { data } = await api.get<Company[]>('/companies');
      setCompanies(data);
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao carregar empresas'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      showToast('Informe o nome da empresa.', 'warning');
      return;
    }

    try {
      setIsSaving(true);

      await api.post('/companies', {
        name: trimmedName,
      });

      setName('');
      await load();

      showToast('Empresa criada com sucesso.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao criar empresa'), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function toggle(company: Company) {
    try {
      setUpdatingId(company.id);

      await api.patch(`/companies/${company.id}`, {
        isActive: !company.isActive,
      });

      await load();

      showToast(
        company.isActive
          ? 'Empresa desativada com sucesso.'
          : 'Empresa ativada com sucesso.',
        'success',
      );
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao atualizar empresa'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  const activeCompanies = useMemo(
    () => companies.filter((company) => company.isActive).length,
    [companies],
  );

  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        isLoading={isLoading}
        onRefresh={load}
        total={companies.length}
        active={activeCompanies}
      />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                Cadastro
              </div>

              <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                Nova empresa
              </h2>

              <p className="mt-2 text-sm leading-6 text-evtag-muted">
                Cadastre uma empresa para controlar usuários, etiquetas e
                operação por CNPJ.
              </p>
            </div>

            <div className="rounded-2xl bg-evtag-primary p-3 text-white">
              <Building2 size={22} />
            </div>
          </div>

          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-evtag-text">
                Nome da empresa
              </span>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Restaurante Modelo"
                className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={isSaving}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={17} />
              {isSaving ? 'Salvando...' : 'Criar empresa'}
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-evtag-border bg-white shadow-sm">
          <div className="border-b border-evtag-border px-6 py-5">
            <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
              Empresas
            </div>

            <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
              Empresas cadastradas
            </h2>

            <p className="mt-1 text-sm text-evtag-muted">
              {companies.length} empresa(s) encontrada(s)
            </p>
          </div>

          {isLoading ? (
            <EmptyMessage message="Carregando empresas..." />
          ) : companies.length === 0 ? (
            <EmptyMessage message="Nenhuma empresa encontrada." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-evtag-border text-sm">
                <thead className="bg-evtag-light/60">
                  <tr>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead align="right">Ações</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-evtag-border bg-white">
                  {companies.map((company) => {
                    const isBusy = updatingId === company.id;

                    return (
                      <tr
                        key={company.id}
                        className="transition hover:bg-evtag-light/50"
                      >
                        <td className="max-w-[360px] px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-evtag-light text-evtag-primary">
                              <Building2 size={18} />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-evtag-text">
                                {company.name}
                              </p>

                              <p className="mt-0.5 text-xs text-evtag-muted">
                                Empresa vinculada ao sistema
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <ActiveBadge isActive={company.isActive} />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => void toggle(company)}
                            disabled={isBusy}
                            className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              company.isActive
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {isBusy
                              ? 'Salvando...'
                              : company.isActive
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
}: {
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  total: number;
  active: number;
}) {
  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-evtag-text">
          Empresas
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-evtag-muted">
          Gerencie os CNPJs atendidos pelo sistema e controle quais empresas
          estão ativas.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <HeaderStat label="Total" value={total} />
        <HeaderStat label="Ativas" value={active} />

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
      {isActive ? 'Ativa' : 'Inativa'}
    </span>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-evtag-muted">
      {message}
    </div>
  );
}