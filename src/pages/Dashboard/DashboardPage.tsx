import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type DashboardResponse = {
  metrics: {
    total: number;
    active: number;
    expired: number;
    warning: number;
    consumed: number;
    discarded: number;
  };
  recent: any[];
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setIsLoading(true);
      const res = await api.get<DashboardResponse>('/labels/dashboard');
      setData(res.data);
    } catch (error) {
      showToast(
        getErrorMessage(error, 'Erro ao carregar dashboard'),
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  }

  const metrics = data?.metrics;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">
          Visão geral da operação de etiquetas.
        </p>
      </div>

      {/* 🔥 FALLBACK */}
      {!data && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          {isLoading ? 'Carregando dashboard...' : 'Sem dados disponíveis'}
        </div>
      )}

      {metrics && (
        <>
          {/* 🔥 CARDS */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Card title="Total" value={metrics.total} />

            <Card title="Ativas" value={metrics.active} color="green" />

            <Card
              title="Vencem nas próximas 6h"
              value={metrics.warning}
              color="yellow"
            />

            <Card title="Vencidas" value={metrics.expired} color="red" />

            <Card title="Consumidas" value={metrics.consumed} color="blue" />

            <Card title="Descartadas" value={metrics.discarded} />
          </div>

          {/* 🔥 TABELA MELHORADA */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Últimas etiquetas
                </h2>
                <p className="text-sm text-slate-600">
                  Últimas 8 geradas
                </p>
              </div>

              <button
                onClick={() => void load()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {isLoading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>

            {isLoading ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                Carregando etiquetas...
              </div>
            ) : data.recent.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                Nenhuma etiqueta encontrada.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[minmax(0,1.4fr)_140px_180px_180px_120px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  <div>Item</div>
                  <div>Lote</div>
                  <div>Gerado em</div>
                  <div>Validade</div>
                  <div>Status</div>
                </div>

                {data.recent.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[minmax(0,1.4fr)_140px_180px_180px_120px] gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {p.labelItem.name}
                      </div>
                      <div className="truncate text-slate-500 text-xs">
                        {p.labelItem.category.name}
                      </div>
                    </div>

                    <div className="text-slate-600">
                      {p.lot ?? '-'}
                    </div>

                    <div className="text-slate-600">
                      {formatDateTime(p.createdAt)}
                    </div>

                    <div className="text-slate-600">
                      {formatDateTime(p.expiresAt)}
                    </div>

                    <div>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  color
}: {
  title: string;
  value: number;
  color?: 'green' | 'red' | 'yellow' | 'blue';
}) {
  const colorMap = {
    green: 'text-emerald-700 border-emerald-200',
    red: 'text-red-700 border-red-200',
    yellow: 'text-yellow-700 border-yellow-200',
    blue: 'text-blue-700 border-blue-200'
  };

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${color ? colorMap[color] : 'border-slate-200'}`}>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    EXPIRED: 'bg-amber-100 text-amber-700',
    DISCARDED: 'bg-red-100 text-red-700',
    CONSUMED: 'bg-blue-100 text-blue-700'
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}