import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Database,
  RefreshCw,
  ServerCog,
  Smartphone,
  Tags,
  Users,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type AdminOverview = {
  companies: {
    total: number;
    active: number;
    inactive: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    superAdmins: number;
    companyAdmins: number;
    operators: number;
  };
  labels: {
    total: number;
    active: number;
    expired: number;
    consumed: number;
    discarded: number;
  };
  devices: {
    total: number;
    active: number;
    inactive: number;
  };
  warnings: Array<{
    type: string;
    title: string;
    value: number;
    severity: 'success' | 'warning' | 'danger' | string;
  }>;
  recent: {
    companies: Array<{
      id: string;
      name: string;
      isActive: boolean;
      createdAt: string;
    }>;
    users: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
      createdAt: string;
      company?: {
        id: string;
        name: string;
      } | null;
    }>;
    labels: Array<{
      id: string;
      status: string;
      createdAt: string;
      expiresAt: string;
      labelItem: {
        name: string;
        company?: {
          id: string;
          name: string;
        } | null;
        category?: {
          name: string;
        } | null;
      };
    }>;
  };
};

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function AdminPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { showToast } = useToast();

  async function loadOverview() {
    try {
      setIsLoading(true);

      const { data: overview } = await api.get<AdminOverview>('/admin/overview');

      setData(overview);
    } catch (error) {
      showToast(
        getErrorMessage(error, 'Erro ao carregar administração'),
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  const healthScore = useMemo(() => {
    if (!data) return 0;

    const problems =
      data.companies.inactive +
      data.users.inactive +
      data.labels.expired +
      data.devices.inactive;

    const total =
      data.companies.total +
      data.users.total +
      data.labels.total +
      data.devices.total;

    if (!total) return 100;

    return Math.max(0, Math.round(100 - (problems / total) * 100));
  }, [data]);

  return (
    <div className="space-y-8 font-sans">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
            Administração geral
          </div>

          <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-evtag-text">
            Painel administrativo
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-evtag-muted">
            Visão global do SaaS para acompanhar uso do sistema, empresas,
            usuários, dispositivos, etiquetas e possíveis pontos de atenção.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Atualizando...' : 'Atualizar administração'}
        </button>
      </header>

      {!data ? (
        <section className="rounded-[2rem] border border-evtag-border bg-white p-8 shadow-sm">
          <p className="text-sm text-evtag-muted">
            {isLoading
              ? 'Carregando informações administrativas...'
              : 'Sem dados administrativos disponíveis.'}
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-[2rem] border border-evtag-border bg-white p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-evtag-text">
                    Saúde geral do sistema
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-evtag-muted">
                    Indicador baseado em empresas, usuários, dispositivos
                    inativos e etiquetas vencidas.
                  </p>
                </div>

                <div className="rounded-2xl bg-evtag-primary p-3 text-white">
                  <ServerCog size={24} />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="font-display text-6xl font-black tracking-tight text-evtag-text">
                    {healthScore}%
                  </div>

                  <p className="mt-2 text-sm font-medium text-evtag-muted">
                    Score operacional
                  </p>
                </div>

                <div className="rounded-3xl bg-evtag-bg px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-evtag-muted">
                    Empresas ativas
                  </p>

                  <p className="mt-1 font-display text-3xl font-black text-evtag-primary">
                    {data.companies.active}/{data.companies.total}
                  </p>
                </div>
              </div>

              <div className="mt-8 h-4 overflow-hidden rounded-full bg-evtag-light">
                <div
                  className="h-full rounded-full bg-evtag-primary transition-all"
                  style={{ width: `${Math.min(healthScore, 100)}%` }}
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-evtag-border bg-evtag-primary p-7 text-white shadow-sm">
              <p className="text-sm font-semibold text-white/70">
                Sem escopo de empresa
              </p>

              <h2 className="mt-3 font-display text-2xl font-black">
                Essa página não usa x-company-id.
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/75">
                Aqui o Super Admin vê dados globais. Para operar uma empresa,
                selecione uma empresa no topo e o sistema passará a enviar o
                header automaticamente.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <MiniInsight label="Empresas" value={data.companies.total} />
                <MiniInsight label="Usuários" value={data.users.total} />
                <MiniInsight label="Etiquetas" value={data.labels.total} />
                <MiniInsight label="Dispositivos" value={data.devices.total} />
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Empresas"
              value={data.companies.total}
              description={`${data.companies.active} ativas · ${data.companies.inactive} inativas`}
              icon={Building2}
              variant="primary"
            />

            <MetricCard
              title="Usuários"
              value={data.users.total}
              description={`${data.users.active} ativos · ${data.users.inactive} inativos`}
              icon={Users}
              variant="info"
            />

            <MetricCard
              title="Etiquetas"
              value={data.labels.total}
              description={`${data.labels.active} ativas · ${data.labels.expired} vencidas`}
              icon={Tags}
              variant="success"
            />

            <MetricCard
              title="Dispositivos"
              value={data.devices.total}
              description={`${data.devices.active} ativos · ${data.devices.inactive} inativos`}
              icon={Smartphone}
              variant="neutral"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
            <div className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-evtag-text">
                    Alertas administrativos
                  </h2>

                  <p className="mt-1 text-sm text-evtag-muted">
                    Pontos de atenção globais do sistema.
                  </p>
                </div>

                <AlertTriangle className="text-evtag-primary" size={24} />
              </div>

              <div className="mt-6 space-y-3">
                {data.warnings.map((warning) => (
                  <div
                    key={warning.type}
                    className="flex items-center justify-between rounded-2xl border border-evtag-border bg-evtag-bg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-evtag-text">
                        {warning.title}
                      </p>

                      <p className="mt-0.5 text-xs text-evtag-muted">
                        Total encontrado no sistema
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                        warning.severity === 'danger'
                          ? 'bg-red-50 text-red-700 ring-red-200'
                          : warning.severity === 'warning'
                            ? 'bg-amber-50 text-amber-700 ring-amber-200'
                            : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      }`}
                    >
                      {warning.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-evtag-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-evtag-border px-6 py-5">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-evtag-text">
                    Atividade recente
                  </h2>

                  <p className="mt-1 text-sm text-evtag-muted">
                    Últimos registros criados no sistema.
                  </p>
                </div>

                <Database className="text-evtag-primary" size={24} />
              </div>

              <div className="grid gap-0 divide-y divide-evtag-border">
                <RecentBlock title="Empresas recentes">
                  {data.recent.companies.length === 0 ? (
                    <EmptyMessage message="Nenhuma empresa recente." />
                  ) : (
                    data.recent.companies.map((company) => (
                      <RecentRow
                        key={company.id}
                        title={company.name}
                        subtitle={company.isActive ? 'Ativa' : 'Inativa'}
                        right={formatDate(company.createdAt)}
                      />
                    ))
                  )}
                </RecentBlock>

                <RecentBlock title="Usuários recentes">
                  {data.recent.users.length === 0 ? (
                    <EmptyMessage message="Nenhum usuário recente." />
                  ) : (
                    data.recent.users.map((user) => (
                      <RecentRow
                        key={user.id}
                        title={user.name}
                        subtitle={`${user.role} · ${user.company?.name ?? 'Sem empresa'}`}
                        right={formatDate(user.createdAt)}
                      />
                    ))
                  )}
                </RecentBlock>

                <RecentBlock title="Etiquetas recentes">
                  {data.recent.labels.length === 0 ? (
                    <EmptyMessage message="Nenhuma etiqueta recente." />
                  ) : (
                    data.recent.labels.map((label) => (
                      <RecentRow
                        key={label.id}
                        title={label.labelItem.name}
                        subtitle={`${label.labelItem.company?.name ?? 'Sem empresa'} · ${label.status}`}
                        right={formatDate(label.createdAt)}
                      />
                    ))
                  )}
                </RecentBlock>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MiniInsight({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs font-semibold text-white/60">{label}</p>
      <p className="mt-1 font-display text-2xl font-black">{value}</p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  variant,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  variant: 'primary' | 'success' | 'info' | 'neutral';
}) {
  const variants: Record<string, string> = {
    primary: 'bg-evtag-light text-evtag-primary',
    success: 'bg-emerald-50 text-emerald-700',
    info: 'bg-blue-50 text-blue-700',
    neutral: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="rounded-[1.75rem] border border-evtag-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${variants[variant]}`}
      >
        <Icon size={22} />
      </div>

      <p className="text-sm font-bold text-evtag-muted">{title}</p>

      <p className="mt-2 font-display text-4xl font-black text-evtag-text">
        {value}
      </p>

      <p className="mt-2 text-sm text-evtag-muted">{description}</p>
    </div>
  );
}

function RecentBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6">
      <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-evtag-muted">
        {title}
      </h3>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function RecentRow({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-evtag-bg px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-evtag-text">{title}</p>
        <p className="mt-0.5 truncate text-xs text-evtag-muted">{subtitle}</p>
      </div>

      <div className="shrink-0 text-xs font-semibold text-evtag-muted">
        {right}
      </div>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-evtag-bg px-4 py-3 text-sm text-evtag-muted">
      {message}
    </div>
  );
}