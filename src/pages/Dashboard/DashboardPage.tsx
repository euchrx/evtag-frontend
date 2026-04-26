import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type LabelStatus = 'ACTIVE' | 'EXPIRED' | 'CONSUMED' | 'DISCARDED';

type DashboardLabelPrint = {
  id: string;
  lot?: string | null;
  status: LabelStatus | string;
  createdAt: string;
  expiresAt: string;
  labelItem: {
    name: string;
    category: {
      name: string;
    };
  };
};

type DashboardResponse = {
  metrics: {
    total: number;
    active: number;
    expired: number;
    warning: number;
    consumed: number;
    discarded: number;
  };
  recent: DashboardLabelPrint[];
};

type MetricVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

function formatDateOnly(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toISOString().slice(0, 10);
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setIsLoading(true);

      const { data: dashboardData } =
        await api.get<DashboardResponse>('/labels/dashboard');

      setData(dashboardData);
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao carregar dashboard'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  const metrics = data?.metrics;

  const controlledPercentage = useMemo(() => {
    if (!metrics?.total) return 0;
    return Math.round((metrics.active / metrics.total) * 100);
  }, [metrics]);

  if (!metrics) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader onRefresh={loadDashboard} isLoading={isLoading} />

        <section className="rounded-[2rem] border border-evtag-border bg-white p-8 shadow-sm">
          <p className="text-sm text-evtag-muted">
            {isLoading ? 'Carregando controlados...' : 'Sem dados disponíveis.'}
          </p>
        </section>
      </div>
    );
  }

  const totalStatus = metrics.total;

  const levels: Array<{
    label: string;
    value: number;
    className: string;
    text: string;
  }> = [
      {
        label: 'Ativas',
        value: metrics.active,
        className: 'bg-emerald-500',
        text: 'text-emerald-700',
      },
      {
        label: 'Vencem hoje',
        value: metrics.warning,
        className: 'bg-amber-400',
        text: 'text-amber-700',
      },
      {
        label: 'Vencidas',
        value: metrics.expired,
        className: 'bg-red-500',
        text: 'text-red-700',
      },
      {
        label: 'Consumidas',
        value: metrics.consumed,
        className: 'bg-blue-500',
        text: 'text-blue-700',
      },
      {
        label: 'Descartadas',
        value: metrics.discarded,
        className: 'bg-slate-400',
        text: 'text-slate-700',
      },
    ];

  return (
    <div className="space-y-8 font-sans">
      <PageHeader onRefresh={loadDashboard} isLoading={isLoading} />

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[2rem] border border-evtag-border bg-white p-7 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                Controlados
              </div>

              <h2 className="mt-5 font-display text-xl font-extrabold text-evtag-text">
                Total de etiquetas controladas
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-evtag-muted">
                Quantidade de etiquetas geradas e acompanhadas no CNPJ
                selecionado.
              </p>
            </div>

            <div className="rounded-2xl bg-evtag-primary p-3 text-white">
              <ShieldCheck size={24} />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="font-display text-6xl font-black tracking-tight text-evtag-text">
                {metrics.total.toLocaleString('pt-BR')}
              </div>

              <p className="mt-2 text-sm font-medium text-evtag-muted">
                Etiquetas totais
              </p>
            </div>

            <div className="rounded-3xl bg-evtag-bg px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-evtag-muted">
                Controle ativo
              </p>

              <p className="mt-1 font-display text-3xl font-black text-evtag-primary">
                {controlledPercentage}%
              </p>
            </div>
          </div>

          <div className="mt-8 h-4 overflow-hidden rounded-full bg-evtag-light">
            <div
              className="h-full rounded-full bg-evtag-primary transition-all"
              style={{ width: `${Math.min(controlledPercentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-evtag-border bg-evtag-primary p-7 text-white shadow-sm">
          <p className="text-sm font-semibold text-white/70">
            Atualizado agora
          </p>

          <h2 className="mt-3 font-display text-2xl font-black">
            Da entrada à saída, tudo registrado.
          </h2>

          <p className="mt-3 text-sm leading-6 text-white/75">
            Acompanhe validade, consumo, descarte e rastreabilidade das
            etiquetas em tempo real.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <MiniInsight label="Ativas" value={metrics.active} />
            <MiniInsight label="Risco" value={metrics.warning} />
            <MiniInsight label="Vencidas" value={metrics.expired} />
            <MiniInsight label="Saídas" value={metrics.consumed} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Ativas"
          value={metrics.active}
          description="Em uso na operação"
          icon={CheckCircle2}
          variant="success"
        />

        <MetricCard
          title="Vencem hoje"
          value={metrics.warning}
          description="Exigem atenção"
          icon={AlertTriangle}
          variant="warning"
        />

        <MetricCard
          title="Vencidas"
          value={metrics.expired}
          description="Não utilizar"
          icon={AlertTriangle}
          variant="danger"
        />

        <MetricCard
          title="Consumidas"
          value={metrics.consumed}
          description="Baixadas no fluxo"
          icon={PackageCheck}
          variant="info"
        />

        <MetricCard
          title="Descartadas"
          value={metrics.discarded}
          description="Perdas registradas"
          icon={Trash2}
          variant="neutral"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
        <div className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-extrabold text-evtag-text">
                Níveis de validade
              </h2>

              <p className="mt-1 text-sm text-evtag-muted">
                Distribuição operacional das etiquetas.
              </p>
            </div>

            <ClipboardCheck className="text-evtag-primary" size={24} />
          </div>

          <div className="mt-6 space-y-4">
            {levels.map((level) => {
              const percentage = totalStatus
                ? Math.round((level.value / totalStatus) * 100)
                : 0;

              return (
                <div key={level.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-evtag-text">
                      {level.label}
                    </span>

                    <span className={`font-bold ${level.text}`}>
                      {percentage}% · {level.value}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-evtag-light">
                    <div
                      className={`h-full rounded-full ${level.className}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-evtag-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-evtag-border px-6 py-5">
            <div>
              <h2 className="font-display text-lg font-extrabold text-evtag-text">
                Últimas movimentações
              </h2>

              <p className="mt-1 text-sm text-evtag-muted">
                Etiquetas geradas recentemente no escopo atual.
              </p>
            </div>
          </div>

          {isLoading ? (
            <EmptyMessage message="Carregando movimentações..." />
          ) : data.recent.length === 0 ? (
            <EmptyMessage message="Nenhuma etiqueta encontrada para este CNPJ." />
          ) : (
            <div className="divide-y divide-evtag-border">
              {data.recent.map((labelPrint) => (
                <div
                  key={labelPrint.id}
                  className="grid gap-4 px-6 py-4 transition hover:bg-evtag-light md:grid-cols-[1fr_120px_120px_120px]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold text-evtag-text">
                      {labelPrint.labelItem.name}
                    </div>

                    <div className="mt-1 truncate text-sm text-evtag-muted">
                      {labelPrint.labelItem.category.name}
                    </div>
                  </div>

                  <InfoColumn label="Lote" value={labelPrint.lot || '-'} />

                  <InfoColumn
                    label="Validade"
                    value={formatDateOnly(labelPrint.expiresAt)}
                  />

                  <div className="flex items-center md:justify-end">
                    <StatusBadge status={labelPrint.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PageHeader({
  onRefresh,
  isLoading,
}: {
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-evtag-text">
          Painel operacional
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-evtag-muted">
          Controle etiquetas, validade, consumo e descarte com rastreabilidade
          por Filial.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void onRefresh()}
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        {isLoading ? 'Atualizando...' : 'Atualizar painel'}
      </button>
    </header>
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
  variant: MetricVariant;
}) {
  const variants: Record<MetricVariant, string> = {
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
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

function InfoColumn({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#9A8AA8]">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-evtag-text">{value}</p>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-evtag-muted">
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    ACTIVE: {
      label: 'Ativa',
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    EXPIRED: {
      label: 'Vencida',
      className: 'bg-red-50 text-red-700 ring-red-200',
    },
    CONSUMED: {
      label: 'Consumida',
      className: 'bg-blue-50 text-blue-700 ring-blue-200',
    },
    DISCARDED: {
      label: 'Descartada',
      className: 'bg-slate-100 text-slate-700 ring-slate-200',
    },
  };

  const currentStatus = statusMap[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${currentStatus.className}`}
    >
      {currentStatus.label}
    </span>
  );
}