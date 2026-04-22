import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';

type Category = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
type LabelItem = {
  id: string;
  name: string;
  categoryId: string;
  category: Category;
  itemType: 'INPUT' | 'PRODUCTION' | 'FRACTIONED';
  defaultShelfLifeHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type LabelPrintStatus = 'ACTIVE' | 'EXPIRED' | 'DISCARDED' | 'CONSUMED';
type ExpirationState = 'OK' | 'WARNING' | 'EXPIRED';

type LabelPrint = {
  id: string;
  labelItemId: string;
  preparedAt: string;
  expiresAt: string;
  quantity: number | null;
  weight: string | null;
  lot: string | null;
  qrCode: string;
  status: LabelPrintStatus;
  createdAt: string;
  updatedAt: string;
  labelItem: LabelItem;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function getExpirationState(expiresAt: string): ExpirationState {
  const now = new Date();
  const expiration = new Date(expiresAt);

  if (expiration.getTime() < now.getTime()) {
    return 'EXPIRED';
  }

  const diffHours = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 6) {
    return 'WARNING';
  }

  return 'OK';
}

export function DashboardPage() {
  const [prints, setPrints] = useState<LabelPrint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void loadPrints();
  }, []);

  async function loadPrints() {
    try {
      setIsLoading(true);
      const response = await api.get<LabelPrint[]>('/labels/prints');
      setPrints(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      alert('Não foi possível carregar o dashboard.');
    } finally {
      setIsLoading(false);
    }
  }

  const metrics = useMemo(() => {
    let active = 0;
    let expired = 0;
    let warning = 0;
    let consumed = 0;
    let discarded = 0;

    for (const print of prints) {
      const expirationState = getExpirationState(print.expiresAt);

      if (print.status === 'ACTIVE') {
        active += 1;
      }

      if (expirationState === 'EXPIRED') {
        expired += 1;
      }

      if (print.status === 'ACTIVE' && expirationState === 'WARNING') {
        warning += 1;
      }

      if (print.status === 'CONSUMED') {
        consumed += 1;
      }

      if (print.status === 'DISCARDED') {
        discarded += 1;
      }
    }

    return {
      total: prints.length,
      active,
      expired,
      warning,
      consumed,
      discarded,
    };
  }, [prints]);

  const recentPrints = useMemo(() => {
    return [...prints]
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 8);
  }, [prints]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">
          Visão geral da operação de etiquetas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Total</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {metrics.total}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-emerald-700">Ativas</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {metrics.active}
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-yellow-700">Vencendo em breve</div>
          <div className="mt-2 text-3xl font-bold text-yellow-700">
            {metrics.warning}
          </div>
        </div>

        <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-red-700">Vencidas</div>
          <div className="mt-2 text-3xl font-bold text-red-700">
            {metrics.expired}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-blue-700">Consumidas</div>
          <div className="mt-2 text-3xl font-bold text-blue-700">
            {metrics.consumed}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-700">Descartadas</div>
          <div className="mt-2 text-3xl font-bold text-slate-700">
            {metrics.discarded}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Últimas etiquetas geradas
            </h2>
            <p className="text-sm text-slate-600">
              Acompanhe as emissões mais recentes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadPrints()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Atualizar
          </button>
        </div>

        {isLoading ? (
          <div className="text-sm text-slate-500">Carregando dashboard...</div>
        ) : recentPrints.length === 0 ? (
          <div className="text-sm text-slate-500">
            Nenhuma etiqueta encontrada.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1.4fr)_160px_180px_180px_120px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <div>Item</div>
              <div>Lote</div>
              <div>Gerada em</div>
              <div>Validade</div>
              <div>Status</div>
            </div>

            {recentPrints.map((print) => (
              <div
                key={print.id}
                className="grid grid-cols-[minmax(0,1.4fr)_160px_180px_180px_120px] gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">
                    {print.labelItem.name}
                  </div>
                  <div className="truncate text-slate-500">
                    {print.labelItem.category.name}
                  </div>
                </div>

                <div className="text-slate-600">{print.lot ?? '-'}</div>

                <div className="text-slate-600">
                  {formatDateTime(print.createdAt)}
                </div>

                <div className="text-slate-600">
                  {formatDateTime(print.expiresAt)}
                </div>

                <div className="text-slate-600">{print.status}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}