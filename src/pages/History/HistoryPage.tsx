import { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';
import {
  CheckCircle2,
  Clock3,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type LabelPrintStatus = 'ACTIVE' | 'EXPIRED' | 'DISCARDED' | 'CONSUMED';
type StatusFilter = 'ALL' | LabelPrintStatus;
type ExpirationFilter = 'ALL' | 'TODAY' | 'EXPIRED';
type ExpirationState = 'OK' | 'TODAY' | 'EXPIRED';

type LabelPrint = {
  id: string;
  preparedAt: string;
  expiresAt: string;
  quantity: number | null;
  weight: string | null;
  lot: string | null;
  qrCode: string;
  status: LabelPrintStatus;
  labelItem: {
    name: string;
    category: {
      name: string;
    };
  };
};

type EditForm = {
  lot: string;
  weight: string;
  expiresAt: string;
};

function formatDateOnly(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toISOString().slice(0, 10);
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  const datePart = date.toISOString().slice(0, 10);
  const timePart = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `${datePart} - ${timePart}`;
}

function toInputDate(value: string) {
  return formatDateOnly(value);
}

function getStatusLabel(status: LabelPrintStatus) {
  const labels: Record<LabelPrintStatus, string> = {
    ACTIVE: 'Ativa',
    EXPIRED: 'Vencida',
    DISCARDED: 'Descartada',
    CONSUMED: 'Consumida',
  };

  return labels[status];
}

function getExpirationState(expiresAt: string): ExpirationState {
  const now = new Date();
  const expiration = new Date(expiresAt);

  if (expiration.getTime() < now.getTime()) {
    return 'EXPIRED';
  }

  const todayKey = now.toISOString().slice(0, 10);
  const expirationKey = expiration.toISOString().slice(0, 10);

  if (expirationKey === todayKey) {
    return 'TODAY';
  }

  return 'OK';
}

function getExpirationLabel(state: ExpirationState) {
  const labels: Record<ExpirationState, string> = {
    OK: 'No prazo',
    TODAY: 'Vence hoje',
    EXPIRED: 'Vencida',
  };

  return labels[state];
}

function getShortCode(qrCode: string) {
  return qrCode.replace(/[^a-zA-Z0-9]/g, '').slice(-7).toUpperCase() || 'EVTAG';
}

export function HistoryPage() {
  const [prints, setPrints] = useState<LabelPrint[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [expirationFilter, setExpirationFilter] =
    useState<ExpirationFilter>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reprintingId, setReprintingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    lot: '',
    weight: '',
    expiresAt: '',
  });

  const { showToast } = useToast();

  useEffect(() => {
    void loadPrints();
  }, []);

  async function loadPrints() {
    try {
      setIsLoading(true);

      const { data } = await api.get<LabelPrint[]>('/labels/prints');

      setPrints(data);
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao carregar histórico'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function startEdit(print: LabelPrint) {
    setEditingId(print.id);
    setEditForm({
      lot: print.lot ?? '',
      weight: print.weight ?? '',
      expiresAt: toInputDate(print.expiresAt),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({
      lot: '',
      weight: '',
      expiresAt: '',
    });
  }

  async function saveEdit(printId: string) {
    try {
      setUpdatingId(printId);

      await api.patch(`/labels/prints/${printId}`, {
        lot: editForm.lot.trim() || null,
        weight: editForm.weight.trim() ? Number(editForm.weight) : null,
        expiresAt: editForm.expiresAt
          ? new Date(`${editForm.expiresAt}T00:00:00`).toISOString()
          : undefined,
      });

      cancelEdit();
      await loadPrints();

      showToast('Etiqueta atualizada com sucesso.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao salvar alterações'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateStatus(id: string, status: LabelPrintStatus) {
    try {
      setUpdatingId(id);

      await api.patch(`/labels/prints/${id}/status`, { status });

      await loadPrints();

      showToast('Status atualizado com sucesso.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao atualizar status'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleReprint(print: LabelPrint) {
    try {
      setReprintingId(print.id);

      const qrBase64 = await QRCode.toDataURL(print.qrCode, {
        margin: 0,
        width: 220,
      });

      const printWindow = window.open('', '_blank', 'width=420,height=700');

      if (!printWindow) {
        showToast('Bloqueador de popup ativo.', 'error');
        return;
      }

      const shortCode = getShortCode(print.qrCode);

      printWindow.document.write(`
        <html>
          <head>
            <title>Reimpressão de etiqueta</title>
            <style>
              @page { size: 58mm auto; margin: 0; }

              * {
                box-sizing: border-box;
              }

              body {
                width: 58mm;
                margin: 0;
                font-family: "Arial Narrow", Arial, Helvetica, sans-serif;
                color: #000;
                background: #fff;
              }

              .label {
                width: 58mm;
                padding: 2mm 2.5mm;
                page-break-after: always;
              }

              .product {
                font-size: 13px;
                font-weight: 900;
                text-transform: uppercase;
                line-height: 1;
              }

              .subtitle-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 4px;
                margin-top: 4px;
              }

              .subtitle {
                font-size: 6.8px;
                font-weight: 900;
                text-transform: uppercase;
              }

              .weight {
                font-size: 7px;
                font-weight: 900;
                white-space: nowrap;
              }

              .rule {
                border-top: 1px solid #000;
                margin: 3px 0;
              }

              .row {
                display: grid;
                grid-template-columns: 72px 1fr;
                font-size: 7.3px;
                line-height: 1.15;
                margin: 0.5px 0;
              }

              .row span {
                font-weight: 900;
              }

              .row strong {
                text-align: right;
                font-weight: 700;
              }

              .bottom {
                display: grid;
                grid-template-columns: 1fr 17mm;
                gap: 3px;
                align-items: end;
              }

              .info {
                font-size: 6.7px;
                line-height: 1.12;
                font-weight: 700;
              }

              .code-text {
                margin-top: 1px;
                font-size: 7px;
                font-weight: 900;
              }

              .qr,
              .qr img {
                width: 17mm;
                height: 17mm;
              }

              .reprint {
                margin-top: 2px;
                font-size: 7px;
                font-weight: 900;
              }
            </style>
          </head>

          <body>
            <div class="label">
              <div class="product">${print.labelItem.name}</div>

              <div class="subtitle-row">
                <div class="subtitle">${print.labelItem.category.name}</div>
                <div class="weight">${print.weight || '-'}</div>
              </div>

              <div class="rule"></div>

              <div class="row">
                <span>PREPARO:</span>
                <strong>${formatDateTime(print.preparedAt)}</strong>
              </div>

              <div class="row">
                <span>VALIDADE:</span>
                <strong>${formatDateTime(print.expiresAt)}</strong>
              </div>

              <div class="row">
                <span>LOTE:</span>
                <strong>${print.lot || '-'}</strong>
              </div>

              <div class="row">
                <span>STATUS:</span>
                <strong>${getStatusLabel(print.status)}</strong>
              </div>

              <div class="rule"></div>

              <div class="bottom">
                <div class="info">
                  <div><strong>QR:</strong> ${print.qrCode}</div>
                  <div class="code-text">#${shortCode}</div>
                  <div class="reprint">REIMPRESSÃO</div>
                </div>

                <div class="qr">
                  <img src="${qrBase64}" />
                </div>
              </div>
            </div>

            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 300);
              };
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao reimprimir etiqueta'), 'error');
    } finally {
      setReprintingId(null);
    }
  }

  const filteredPrints = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return prints.filter((print) => {
      const expirationState = getExpirationState(print.expiresAt);

      const matchesStatus =
        statusFilter === 'ALL' ? true : print.status === statusFilter;

      const matchesExpiration =
        expirationFilter === 'ALL'
          ? true
          : expirationFilter === expirationState;

      const matchesSearch = normalizedSearch
        ? print.labelItem.name.toLowerCase().includes(normalizedSearch) ||
          print.labelItem.category.name
            .toLowerCase()
            .includes(normalizedSearch) ||
          (print.lot ?? '').toLowerCase().includes(normalizedSearch) ||
          print.qrCode.toLowerCase().includes(normalizedSearch)
        : true;

      return matchesStatus && matchesExpiration && matchesSearch;
    });
  }, [prints, search, statusFilter, expirationFilter]);

  const activeCount = useMemo(
    () => prints.filter((print) => print.status === 'ACTIVE').length,
    [prints],
  );

  const todayCount = useMemo(
    () =>
      prints.filter((print) => getExpirationState(print.expiresAt) === 'TODAY')
        .length,
    [prints],
  );

  const expiredCount = useMemo(
    () =>
      prints.filter((print) => getExpirationState(print.expiresAt) === 'EXPIRED')
        .length,
    [prints],
  );

  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        isLoading={isLoading}
        onRefresh={loadPrints}
        total={prints.length}
        active={activeCount}
        today={todayCount}
        expired={expiredCount}
      />

      <section className="rounded-[2rem] border border-evtag-border bg-white shadow-sm">
        <div className="border-b border-evtag-border px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                Histórico
              </div>

              <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                Etiquetas geradas
              </h2>

              <p className="mt-1 text-sm text-evtag-muted">
                {filteredPrints.length} resultado(s) no escopo atual.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px] xl:w-[760px]">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-evtag-muted"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por item, categoria, lote ou QR"
                  className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg pl-11 pr-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="h-11 rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativas</option>
                <option value="EXPIRED">Vencidas</option>
                <option value="DISCARDED">Descartadas</option>
                <option value="CONSUMED">Consumidas</option>
              </select>

              <select
                value={expirationFilter}
                onChange={(event) =>
                  setExpirationFilter(event.target.value as ExpirationFilter)
                }
                className="h-11 rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
              >
                <option value="ALL">Todas validades</option>
                <option value="TODAY">Vencem hoje</option>
                <option value="EXPIRED">Vencidas</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <EmptyMessage message="Carregando histórico..." />
        ) : filteredPrints.length === 0 ? (
          <EmptyMessage message="Nenhuma etiqueta encontrada." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-evtag-border text-sm">
              <thead className="bg-evtag-light/60">
                <tr>
                  <TableHead>Item</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Preparo</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alerta</TableHead>
                  <TableHead align="right">Ações</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-evtag-border bg-white">
                {filteredPrints.map((print) => {
                  const expirationState = getExpirationState(print.expiresAt);
                  const isEditing = editingId === print.id;
                  const isBusy =
                    updatingId === print.id || reprintingId === print.id;

                  return (
                    <tr
                      key={print.id}
                      className="transition hover:bg-evtag-light/50"
                    >
                      <td className="max-w-[320px] px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-evtag-light text-evtag-primary">
                            <Clock3 size={18} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-evtag-text">
                              {print.labelItem.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-evtag-muted">
                              {print.labelItem.category.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-evtag-muted/70">
                              QR: {print.qrCode}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {isEditing ? (
                          <input
                            value={editForm.lot}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                lot: event.target.value,
                              }))
                            }
                            className="h-10 w-32 rounded-xl border border-evtag-border bg-white px-3 text-sm font-medium outline-none focus:border-evtag-primary focus:ring-4 focus:ring-evtag-light"
                          />
                        ) : (
                          <span className="font-medium text-evtag-muted">
                            {print.lot || '-'}
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-medium text-evtag-muted">
                        {formatDateOnly(print.preparedAt)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.expiresAt}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                expiresAt: event.target.value,
                              }))
                            }
                            className="h-10 rounded-xl border border-evtag-border bg-white px-3 text-sm font-medium outline-none focus:border-evtag-primary focus:ring-4 focus:ring-evtag-light"
                          />
                        ) : (
                          <span className="font-medium text-evtag-muted">
                            {formatDateOnly(print.expiresAt)}
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <StatusBadge status={print.status} />
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <ExpirationBadge state={expirationState} />

                        {isEditing ? (
                          <input
                            value={editForm.weight}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                weight: event.target.value,
                              }))
                            }
                            placeholder="Peso"
                            className="mt-2 h-10 w-28 rounded-xl border border-evtag-border bg-white px-3 text-sm font-medium outline-none focus:border-evtag-primary focus:ring-4 focus:ring-evtag-light"
                          />
                        ) : (
                          <p className="mt-1 text-xs font-medium text-evtag-muted">
                            Peso: {print.weight || '-'}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <ActionButton
                              variant="success"
                              onClick={() => void saveEdit(print.id)}
                              disabled={isBusy}
                            >
                              <CheckCircle2 size={15} />
                              Salvar
                            </ActionButton>

                            <ActionButton
                              variant="neutral"
                              onClick={cancelEdit}
                              disabled={isBusy}
                            >
                              <X size={15} />
                              Cancelar
                            </ActionButton>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <ActionButton
                              variant="warning"
                              onClick={() => startEdit(print)}
                              disabled={isBusy}
                            >
                              <Pencil size={15} />
                              Editar
                            </ActionButton>

                            <ActionButton
                              variant="neutral"
                              onClick={() => void handleReprint(print)}
                              disabled={isBusy}
                            >
                              <Printer size={15} />
                              {reprintingId === print.id
                                ? 'Reimprimindo...'
                                : 'Reimprimir'}
                            </ActionButton>

                            <ActionButton
                              variant="info"
                              onClick={() =>
                                void updateStatus(print.id, 'CONSUMED')
                              }
                              disabled={isBusy || print.status === 'CONSUMED'}
                            >
                              Consumir
                            </ActionButton>

                            <ActionButton
                              variant="danger"
                              onClick={() =>
                                void updateStatus(print.id, 'DISCARDED')
                              }
                              disabled={isBusy || print.status === 'DISCARDED'}
                            >
                              <Trash2 size={15} />
                              Descartar
                            </ActionButton>
                          </div>
                        )}
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
  );
}

function PageHeader({
  isLoading,
  onRefresh,
  total,
  active,
  today,
  expired,
}: {
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  total: number;
  active: number;
  today: number;
  expired: number;
}) {
  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-evtag-text">
          Histórico
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-evtag-muted">
          Acompanhe etiquetas geradas, status, validade, consumo e descarte.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <HeaderStat label="Total" value={total} />
        <HeaderStat label="Ativas" value={active} />
        <HeaderStat label="Vencem hoje" value={today} />
        <HeaderStat label="Vencidas" value={expired} />

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

function StatusBadge({ status }: { status: LabelPrintStatus }) {
  const classMap: Record<LabelPrintStatus, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    EXPIRED: 'bg-red-50 text-red-700 ring-red-200',
    DISCARDED: 'bg-slate-100 text-slate-700 ring-slate-200',
    CONSUMED: 'bg-blue-50 text-blue-700 ring-blue-200',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${classMap[status]}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function ExpirationBadge({ state }: { state: ExpirationState }) {
  const classMap: Record<ExpirationState, string> = {
    OK: 'bg-slate-100 text-slate-700 ring-slate-200',
    TODAY: 'bg-amber-50 text-amber-700 ring-amber-200',
    EXPIRED: 'bg-red-50 text-red-700 ring-red-200',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${classMap[state]}`}
    >
      {getExpirationLabel(state)}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}) {
  const classMap = {
    success:
      'bg-emerald-50 text-emerald-700 ring-emerald-100 hover:bg-emerald-100',
    warning: 'bg-amber-50 text-amber-700 ring-amber-100 hover:bg-amber-100',
    danger: 'bg-red-50 text-red-700 ring-red-100 hover:bg-red-100',
    info: 'bg-blue-50 text-blue-700 ring-blue-100 hover:bg-blue-100',
    neutral: 'bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${classMap[variant]}`}
    >
      {children}
    </button>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-evtag-muted">
      {message}
    </div>
  );
}