import { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';
import { api } from '../../services/api';

type Category = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

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
type StatusFilter = 'ALL' | LabelPrintStatus;
type ExpirationFilter = 'ALL' | 'WARNING' | 'EXPIRED';
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

type EditForm = {
  lot: string;
  weight: string;
  expiresAt: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function toInputDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function getStatusLabel(status: LabelPrintStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Ativa';
    case 'EXPIRED':
      return 'Vencida';
    case 'DISCARDED':
      return 'Descartada';
    case 'CONSUMED':
      return 'Consumida';
    default:
      return status;
  }
}

function getStatusClasses(status: LabelPrintStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-700';
    case 'EXPIRED':
      return 'bg-amber-100 text-amber-700';
    case 'DISCARDED':
      return 'bg-red-100 text-red-700';
    case 'CONSUMED':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
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

function getExpirationLabel(state: ExpirationState) {
  switch (state) {
    case 'EXPIRED':
      return 'Vencida';
    case 'WARNING':
      return 'Vencendo em breve';
    case 'OK':
      return 'No prazo';
    default:
      return state;
  }
}

function getExpirationBadgeClasses(state: ExpirationState) {
  switch (state) {
    case 'EXPIRED':
      return 'bg-red-100 text-red-700';
    case 'WARNING':
      return 'bg-yellow-100 text-yellow-700';
    case 'OK':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function getRowHighlightClasses(state: ExpirationState) {
  switch (state) {
    case 'EXPIRED':
      return 'bg-red-50';
    case 'WARNING':
      return 'bg-yellow-50';
    case 'OK':
      return '';
    default:
      return '';
  }
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

  useEffect(() => {
    void loadPrints();
  }, []);

  async function loadPrints() {
    try {
      setIsLoading(true);
      const response = await api.get<LabelPrint[]>('/labels/prints');
      setPrints(response.data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      alert('Não foi possível carregar o histórico.');
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(id: string, status: LabelPrintStatus) {
    try {
      setUpdatingId(id);
      await api.patch(`/labels/prints/${id}/status`, { status });
      await loadPrints();
    } catch (error) {
      console.error('Erro ao atualizar status da etiqueta:', error);
      alert('Não foi possível atualizar o status da etiqueta.');
    } finally {
      setUpdatingId(null);
    }
  }

  function startEdit(print: LabelPrint) {
    setEditingId(print.id);
    setEditForm({
      lot: print.lot ?? '',
      weight: print.weight ?? '',
      expiresAt: toInputDateTimeLocal(print.expiresAt),
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
          ? new Date(editForm.expiresAt).toISOString()
          : undefined,
      });

      cancelEdit();
      await loadPrints();
    } catch (error) {
      console.error('Erro ao editar etiqueta:', error);
      alert('Não foi possível salvar as alterações da etiqueta.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleReprint(print: LabelPrint) {
    try {
      setReprintingId(print.id);

      const qrBase64 = await QRCode.toDataURL(print.qrCode, {
        margin: 1,
        width: 160,
      });

      const printWindow = window.open('', '_blank', 'width=420,height=700');

      if (!printWindow) {
        alert('Não foi possível abrir a janela de impressão.');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
            <title>Reimpressão de etiqueta</title>
            <style>
              @page {
                size: 58mm auto;
                margin: 0;
              }
              * {
                box-sizing: border-box;
              }
              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
                font-family: Arial, sans-serif;
                color: #000000;
              }
              body {
                width: 58mm;
                padding: 0;
              }
              .label {
                width: 58mm;
                padding: 4mm;
              }
              .title {
                font-size: 14px;
                font-weight: 700;
                line-height: 1.2;
                text-transform: uppercase;
                margin-bottom: 4px;
              }
              .divider {
                border-top: 1px solid #000;
                margin: 4px 0;
              }
              .line {
                font-size: 11px;
                line-height: 1.35;
                margin-bottom: 2px;
              }
              .expire {
                font-size: 13px;
                font-weight: 700;
                line-height: 1.3;
                margin-top: 4px;
                margin-bottom: 4px;
              }
              .qr {
                margin-top: 6px;
                text-align: center;
              }
              .qr img {
                width: 80px;
                height: 80px;
                display: inline-block;
              }
              .code {
                margin-top: 4px;
                font-size: 9px;
                text-align: center;
                word-break: break-all;
              }
              .tag {
                margin-top: 6px;
                text-align: center;
                font-size: 10px;
                font-weight: 700;
              }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="title">${print.labelItem.name}</div>
              <div class="divider"></div>
              <div class="line"><strong>Categoria:</strong> ${print.labelItem.category.name}</div>
              <div class="line"><strong>Preparo:</strong> ${formatDateTime(print.preparedAt)}</div>
              <div class="expire"><strong>Validade:</strong> ${formatDateTime(print.expiresAt)}</div>
              <div class="line"><strong>Lote:</strong> ${print.lot ?? '-'}</div>
              <div class="line"><strong>Peso:</strong> ${print.weight ?? '-'}</div>
              <div class="qr">
                <img src="${qrBase64}" alt="QR Code da etiqueta" />
              </div>
              <div class="code">${print.qrCode}</div>
              <div class="tag">REIMPRESSÃO</div>
            </div>
            <script>
              window.onload = function () {
                window.print();
                window.onafterprint = function () {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Erro ao reimprimir etiqueta:', error);
      alert('Não foi possível reimprimir a etiqueta.');
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
          print.labelItem.category.name.toLowerCase().includes(normalizedSearch) ||
          (print.lot ?? '').toLowerCase().includes(normalizedSearch) ||
          print.qrCode.toLowerCase().includes(normalizedSearch)
        : true;

      return matchesStatus && matchesExpiration && matchesSearch;
    });
  }, [prints, search, statusFilter, expirationFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Histórico de etiquetas
        </h1>
        <p className="text-sm text-slate-600">
          Acompanhe, reimprima, edite e atualize o status operacional.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Etiquetas geradas
            </h2>
            <p className="text-sm text-slate-600">
              {filteredPrints.length} etiqueta(s) encontrada(s)
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por item, categoria, lote ou QR Code"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900 xl:w-80"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativa</option>
              <option value="EXPIRED">Vencida</option>
              <option value="DISCARDED">Descartada</option>
              <option value="CONSUMED">Consumida</option>
            </select>

            <select
              value={expirationFilter}
              onChange={(e) =>
                setExpirationFilter(e.target.value as ExpirationFilter)
              }
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
            >
              <option value="ALL">Validade: Todas</option>
              <option value="WARNING">Vencendo em breve</option>
              <option value="EXPIRED">Vencidas</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[minmax(0,1.2fr)_110px_160px_160px_120px_140px_320px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <div>Item</div>
            <div>Lote</div>
            <div>Preparo</div>
            <div>Validade</div>
            <div>Status</div>
            <div>Alerta</div>
            <div>Ações</div>
          </div>

          {isLoading ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              Carregando histórico...
            </div>
          ) : filteredPrints.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              Nenhuma etiqueta encontrada.
            </div>
          ) : (
            filteredPrints.map((print) => {
              const expirationState = getExpirationState(print.expiresAt);
              const isEditing = editingId === print.id;

              return (
                <div
                  key={print.id}
                  className={`grid grid-cols-[minmax(0,1.2fr)_110px_160px_160px_120px_140px_320px] gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 ${getRowHighlightClasses(expirationState)}`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">
                      {print.labelItem.name}
                    </div>
                    <div className="truncate text-slate-500">
                      {print.labelItem.category.name}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      QR: {print.qrCode}
                    </div>
                  </div>

                  <div className="text-slate-600">
                    {isEditing ? (
                      <input
                        value={editForm.lot}
                        onChange={(e) =>
                          setEditForm((current) => ({
                            ...current,
                            lot: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      print.lot ?? '-'
                    )}
                  </div>

                  <div className="text-slate-600">
                    {formatDateTime(print.preparedAt)}
                  </div>

                  <div className="text-slate-600">
                    {isEditing ? (
                      <input
                        type="datetime-local"
                        value={editForm.expiresAt}
                        onChange={(e) =>
                          setEditForm((current) => ({
                            ...current,
                            expiresAt: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      formatDateTime(print.expiresAt)
                    )}
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(print.status)}`}
                    >
                      {getStatusLabel(print.status)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getExpirationBadgeClasses(expirationState)}`}
                    >
                      {getExpirationLabel(expirationState)}
                    </span>

                    {isEditing ? (
                      <input
                        value={editForm.weight}
                        onChange={(e) =>
                          setEditForm((current) => ({
                            ...current,
                            weight: e.target.value,
                          }))
                        }
                        placeholder="Peso"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      <div className="text-xs text-slate-500">
                        Peso: {print.weight ?? '-'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(print.id)}
                          disabled={updatingId === print.id}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Salvar
                        </button>

                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg bg-slate-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-600"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(print)}
                          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-700"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReprint(print)}
                          disabled={reprintingId === print.id}
                          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {reprintingId === print.id ? 'Reimprimindo...' : 'Reimprimir'}
                        </button>

                        <button
                          type="button"
                          onClick={() => updateStatus(print.id, 'CONSUMED')}
                          disabled={updatingId === print.id}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          Consumida
                        </button>

                        <button
                          type="button"
                          onClick={() => updateStatus(print.id, 'DISCARDED')}
                          disabled={updatingId === print.id}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          Descartada
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}