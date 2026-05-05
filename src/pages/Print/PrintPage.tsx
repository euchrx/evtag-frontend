import { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';
import {
  BadgeCheck,
  Clock3,
  Copy,
  Package,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type WeightUnit = 'g' | 'kg' | 'un';
type ApiWeightUnit = 'G' | 'KG' | 'UN';

type LabelItem = {
  id: string;
  name: string;
  category?: {
    id: string;
    name: string;
  } | null;
  defaultShelfLifeHours?: number | null;
};

type PrintResponse = {
  id: string;
  qrCode: string;
  preparedAt: string;
  expiresAt: string;
  originalExpiresAt?: string | null;
  quantity?: number | null;
  weight?: number | string | null;
  weightUnit?: ApiWeightUnit | null;
  lot?: string | null;
  brandOrSupplier?: string | null;
  sif?: string | null;
  responsible?: string | null;
  showQr?: boolean | null;
  labelItem: {
    name: string;
    category?: {
      name: string;
    } | null;
  };
  company?: {
    name?: string | null;
    tradeName?: string | null;
    document?: string | null;
    cnpj?: string | null;
    cep?: string | null;
    street?: string | null;
    number?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
};

type RecentPrint = {
  id: string;
  itemId: string;
  itemName: string;
  printedAt: string;
  lot?: string;
  copies: number;
};

const FAVORITES_KEY = 'evtag_print_favorite_items';
const RECENTS_KEY = 'evtag_print_recent_items';

function toApiWeightUnit(unit: WeightUnit): ApiWeightUnit {
  if (unit === 'kg') return 'KG';
  if (unit === 'un') return 'UN';
  return 'G';
}

function toUiWeightUnit(unit?: ApiWeightUnit | null): WeightUnit {
  if (unit === 'KG') return 'kg';
  if (unit === 'UN') return 'un';
  return 'g';
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatWeight(value?: string | number | null, unit: WeightUnit = 'g') {
  if (value === null || value === undefined || value === '') return '-';

  const numeric = Number(value);

  if (Number.isNaN(numeric)) return '-';

  const formatted = numeric.toLocaleString('pt-BR', {
    maximumFractionDigits: 3,
  });

  return `${formatted}${unit}`;
}

function getShortCode(qrCode: string) {
  return qrCode.replace(/[^a-zA-Z0-9]/g, '').slice(-7).toUpperCase() || 'EVTAG';
}

function buildDateAtStartOfDay(dateValue: string) {
  if (!dateValue) return undefined;

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString();
}


function readJsonArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJsonArray<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function PrintPage() {
  const [items, setItems] = useState<LabelItem[]>([]);
  const [selected, setSelected] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [copies, setCopies] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('g');
  const [lot, setLot] = useState('');
  const [showQr, setShowQr] = useState(true);

  const [originalDate, setOriginalDate] = useState('');
  const [brandOrSupplier, setBrandOrSupplier] = useState('');
  const [sif, setSif] = useState('');
  const [responsible, setResponsible] = useState('');

  const [lastPrint, setLastPrint] = useState<PrintResponse | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    readJsonArray<string>(FAVORITES_KEY),
  );
  const [recentPrints, setRecentPrints] = useState<RecentPrint[]>(() =>
    readJsonArray<RecentPrint>(RECENTS_KEY),
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    void loadItems();
  }, []);

  async function loadItems() {
    try {
      setIsLoading(true);

      const { data } = await api.get<LabelItem[]>('/labels/items');

      setItems(data);
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao carregar produtos'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm(keepProduct = true) {
    if (!keepProduct) {
      setSelected('');
      setSearchTerm('');
    }

    setCopies(1);
    setQuantity(1);
    setWeight('');
    setWeightUnit('g');
    setLot('');
    setOriginalDate('');
    setBrandOrSupplier('');
    setSif('');
  }

  function selectItem(itemId: string) {
    setSelected(itemId);

    const item = items.find((current) => current.id === itemId);
    if (item) {
      setSearchTerm(item.name);
    }
  }

  function toggleFavorite(itemId: string) {
    const nextFavorites = favoriteIds.includes(itemId)
      ? favoriteIds.filter((id) => id !== itemId)
      : [itemId, ...favoriteIds].slice(0, 12);

    setFavoriteIds(nextFavorites);
    saveJsonArray(FAVORITES_KEY, nextFavorites);
  }

  function saveRecent(print: PrintResponse, itemId: string, printedCopies: number) {
    const nextRecent: RecentPrint[] = [
      {
        id: print.id,
        itemId,
        itemName: print.labelItem.name,
        printedAt: new Date().toISOString(),
        lot: print.lot ?? (lot.trim() || undefined),
        copies: printedCopies,
      },
      ...recentPrints.filter((recent) => recent.itemId !== itemId),
    ].slice(0, 8);

    setRecentPrints(nextRecent);
    saveJsonArray(RECENTS_KEY, nextRecent);
  }

  function getCompanyDisplay(print: PrintResponse) {
    const company = print.company;

    const resolvedCompanyName = company?.tradeName || company?.name || '-';
    const resolvedCnpj = company?.cnpj || company?.document || '-';
    const resolvedCep = company?.cep || '-';

    const streetParts = [company?.street, company?.number].filter(Boolean);
    const resolvedStreet = streetParts.length > 0 ? streetParts.join(', ') : '-';
    const resolvedCityState = [company?.city, company?.state]
      .filter(Boolean)
      .join(' - ') || '-';

    return {
      companyName: resolvedCompanyName,
      cnpj: resolvedCnpj,
      cep: resolvedCep,
      street: resolvedStreet,
      cityState: resolvedCityState,
    };
  }

  async function printWindow(print: PrintResponse, printedCopies: number) {
    const shouldShowQr = print.showQr ?? showQr;

    const qrBase64 = await QRCode.toDataURL(print.qrCode, {
      margin: 0,
      width: 220,
    });

    const win = window.open('', '_blank', 'width=420,height=700');

    if (!win) {
      showToast('Bloqueador de popup ativo.', 'error');
      return false;
    }

    const resolvedUnit = toUiWeightUnit(print.weightUnit) || weightUnit;
    const formattedWeight = formatWeight(print.weight ?? weight, resolvedUnit);
    const manipulationDate = formatDateTime(print.preparedAt);
    const expirationDate = formatDateTime(print.expiresAt);
    const originalExpirationDate = print.originalExpiresAt
      ? formatDateTime(print.originalExpiresAt)
      : originalDate
        ? formatDateTime(`${originalDate}T00:00:00`)
        : '-';

    const shortCode = getShortCode(print.qrCode);
    const company = getCompanyDisplay(print);
    const resolvedBrandOrSupplier = print.brandOrSupplier || brandOrSupplier || '-';
    const resolvedSif = print.sif || sif || '-';
    const resolvedResponsible = print.responsible || responsible || '-';
    const resolvedLot = print.lot || lot || '-';
    const resolvedQuantity = print.quantity ?? quantity;

    let labels = '';

    for (let index = 0; index < printedCopies; index += 1) {
      labels += `
        <div class="label">
          <div class="product">${print.labelItem.name}</div>
          <div class="subtitle-row">
            <div class="subtitle">PRODUÇÃO / MANIPULAÇÃO</div>
            <div class="weight">${formattedWeight}</div>
          </div>

          <div class="rule"></div>

          <div class="row"><span>LOTE:</span><strong>${resolvedLot}</strong></div>
          <div class="row"><span>QTD.:</span><strong>${resolvedQuantity}</strong></div>
          <div class="row"><span>VAL. ORIGINAL:</span><strong>${originalExpirationDate}</strong></div>
          <div class="row"><span>MANIPULAÇÃO:</span><strong>${manipulationDate}</strong></div>
          <div class="row"><span>VALIDADE:</span><strong>${expirationDate}</strong></div>
          <div class="row"><span>MARCA / FORN.:</span><strong>${resolvedBrandOrSupplier}</strong></div>
          <div class="row"><span>SIF:</span><strong>${resolvedSif}</strong></div>

          <div class="rule"></div>

          <div class="bottom">
            <div class="info">
              <div><strong>RESP.:</strong> ${resolvedResponsible}</div>
              <div>${company.companyName}</div>
              <div>CNPJ: ${company.cnpj}</div>
              <div>CEP: ${company.cep}</div>
              <div>${company.street}</div>
              <div>${company.cityState}</div>
              <div class="code-text">#${shortCode}</div>
            </div>

            ${
              shouldShowQr
                ? `<div class="qr"><img src="${qrBase64}" /></div>`
                : ''
            }
          </div>
        </div>
      `;
    }

    win.document.write(`
      <html>
        <head>
          <title>EvTag - Impressão</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            * { box-sizing: border-box; }
            body {
              width: 58mm;
              margin: 0;
              font-family: "Arial Narrow", Arial, Helvetica, sans-serif;
              color: #000;
              background: #fff;
            }
            .label {
              width: 58mm;
              padding: 2mm 2.3mm;
              page-break-after: always;
            }
            .product {
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              line-height: 1;
              text-align: left;
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
            .row span { font-weight: 900; }
            .row strong { text-align: right; font-weight: 700; }
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
            .info strong { font-weight: 900; }
            .code-text {
              margin-top: 1px;
              font-size: 7px;
              font-weight: 900;
            }
            .qr, .qr img {
              width: 17mm;
              height: 17mm;
            }
          </style>
        </head>
        <body>
          ${labels}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 350);
            };
          </script>
        </body>
      </html>
    `);

    win.document.close();
    return true;
  }

  async function createLabelPrint() {
    if (!selected) {
      showToast('Selecione um produto.', 'warning');
      return null;
    }

    if (copies < 1 || quantity < 1) {
      showToast('Informe uma quantidade válida.', 'warning');
      return null;
    }

    const parsedWeight = weight.trim() ? Number(weight.replace(',', '.')) : undefined;

    if (parsedWeight !== undefined && Number.isNaN(parsedWeight)) {
      showToast('Informe um peso válido.', 'warning');
      return null;
    }

    const { data } = await api.post<PrintResponse>('/labels/prints', {
      labelItemId: selected,
      quantity,
      weight: parsedWeight,
      weightUnit: toApiWeightUnit(weightUnit),
      lot: lot.trim() || undefined,
      originalExpiresAt: buildDateAtStartOfDay(originalDate),
      brandOrSupplier: brandOrSupplier.trim() || undefined,
      sif: sif.trim() || undefined,
      responsible: responsible.trim() || undefined,
      showQr,
    });

    return data;
  }

  async function handlePrint() {
    try {
      setIsPrinting(true);

      const print = await createLabelPrint();

      if (!print) return;

      setLastPrint(print);
      saveRecent(print, selected, copies);

      const printed = await printWindow(print, copies);

      if (printed) {
        showToast('Etiqueta enviada para impressão.', 'success');
        resetForm(true);
      }
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao imprimir etiqueta'), 'error');
    } finally {
      setIsPrinting(false);
    }
  }

  async function handlePrintAndClear() {
    try {
      setIsPrinting(true);

      const print = await createLabelPrint();

      if (!print) return;

      setLastPrint(print);
      saveRecent(print, selected, copies);

      const printed = await printWindow(print, copies);

      if (printed) {
        showToast('Etiqueta enviada para impressão.', 'success');
        resetForm(false);
      }
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao imprimir etiqueta'), 'error');
    } finally {
      setIsPrinting(false);
    }
  }

  async function handleReprintLast() {
    if (!lastPrint) return;

    try {
      setIsPrinting(true);
      await printWindow(lastPrint, copies);
      showToast('Reimpressão enviada.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao reimprimir etiqueta'), 'error');
    } finally {
      setIsPrinting(false);
    }
  }

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selected) ?? null,
    [items, selected],
  );

  const favoriteItems = useMemo(
    () => favoriteIds
      .map((id) => items.find((item) => item.id === id))
      .filter(Boolean) as LabelItem[],
    [favoriteIds, items],
  );

  const filteredItems = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return items.slice(0, 12);
    }

    return items
      .filter((item) =>
        `${item.name} ${item.category?.name ?? ''}`.toLowerCase().includes(search),
      )
      .slice(0, 20);
  }, [items, searchTerm]);

  const validityPreview = useMemo(() => {
    if (!selectedItem?.defaultShelfLifeHours) return 'Pelo cadastro';

    const expires = new Date(
      Date.now() + selectedItem.defaultShelfLifeHours * 60 * 60 * 1000,
    );

    return formatDateTime(expires.toISOString());
  }, [selectedItem]);

  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        isLoading={isLoading}
        isPrinting={isPrinting}
        onRefresh={loadItems}
        totalProducts={items.length}
        lastPrint={lastPrint}
        onReprint={handleReprintLast}
      />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                  Impressão rápida
                </div>

                <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                  Produto
                </h2>
              </div>

              <div className="rounded-2xl bg-evtag-primary p-3 text-white">
                <Package size={22} />
              </div>
            </div>

            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-evtag-muted"
              />

              <input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setSelected('');
                }}
                placeholder="Buscar produto por nome ou categoria"
                className="h-12 w-full rounded-2xl border border-evtag-border bg-evtag-bg pl-11 pr-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
              />
            </div>

            <div className="mt-4 grid max-h-[310px] gap-2 overflow-y-auto pr-1">
              {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-evtag-border bg-evtag-bg px-4 py-8 text-center text-sm text-evtag-muted">
                  Nenhum produto encontrado.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const active = selected === item.id;
                  const favorite = favoriteIds.includes(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectItem(item.id)}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? 'border-evtag-primary bg-evtag-light ring-2 ring-evtag-light'
                          : 'border-evtag-border bg-white hover:bg-evtag-bg'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-evtag-text">
                          {item.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-evtag-muted">
                          {item.category?.name ?? 'Sem categoria'} · {item.defaultShelfLifeHours ?? '-'}h
                        </p>
                      </div>

                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleFavorite(item.id);
                          }
                        }}
                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                          favorite
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-evtag-bg text-evtag-muted hover:text-amber-600'
                        }`}
                        title={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        <Star size={17} fill={favorite ? 'currentColor' : 'none'} />
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                  Dados da etiqueta
                </div>

                <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                  Produção
                </h2>
              </div>

              <button
                type="button"
                onClick={() => resetForm(false)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-evtag-border bg-white px-4 text-sm font-bold text-evtag-text transition hover:bg-evtag-bg"
              >
                <RotateCcw size={17} />
                Limpar
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Cópias"
                type="number"
                min={1}
                value={copies}
                onChange={(value) => setCopies(Math.max(1, Number(value) || 1))}
              />

              <Input
                label="Quantidade"
                type="number"
                min={1}
                value={quantity}
                onChange={(value) => setQuantity(Math.max(1, Number(value) || 1))}
              />

              <div className="grid grid-cols-[1fr_96px] gap-3">
                <Input
                  label="Peso"
                  value={weight}
                  onChange={setWeight}
                  placeholder="250"
                />

                <label className="block space-y-2">
                  <span className="text-sm font-bold text-evtag-text">Un.</span>

                  <select
                    value={weightUnit}
                    onChange={(event) => setWeightUnit(event.target.value as WeightUnit)}
                    className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-3 text-sm font-bold text-evtag-text outline-none transition focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="un">un</option>
                  </select>
                </label>
              </div>

              <Input label="Lote" value={lot} onChange={setLot} placeholder="Opcional" />

              <Input
                label="Validade original"
                type="date"
                value={originalDate}
                onChange={setOriginalDate}
              />

              <Input
                label="Responsável"
                value={responsible}
                onChange={setResponsible}
                placeholder="Operador"
              />

              <Input
                label="Marca / fornecedor"
                value={brandOrSupplier}
                onChange={setBrandOrSupplier}
                placeholder="Opcional"
              />

              <Input label="SIF" value={sif} onChange={setSif} placeholder="Opcional" />

              <label className="flex h-11 cursor-pointer items-center justify-between rounded-2xl border border-evtag-border bg-evtag-bg px-4 md:mt-7">
                <span className="text-sm font-bold text-evtag-text">QR Code</span>
                <input
                  type="checkbox"
                  checked={showQr}
                  onChange={(event) => setShowQr(event.target.checked)}
                  className="h-5 w-5 accent-[#3C0061]"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr]">
              <button
                type="button"
                onClick={() => void handlePrint()}
                disabled={isPrinting || isLoading || !selected}
                className="inline-flex h-13 min-h-13 items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 py-4 text-sm font-black text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Printer size={18} />
                {isPrinting ? 'Imprimindo...' : 'Imprimir e manter produto'}
              </button>

              <button
                type="button"
                onClick={() => void handlePrintAndClear()}
                disabled={isPrinting || isLoading || !selected}
                className="inline-flex h-13 min-h-13 items-center justify-center gap-2 rounded-2xl border border-evtag-border bg-white px-5 py-4 text-sm font-black text-evtag-text transition hover:bg-evtag-bg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Zap size={18} />
                Imprimir e limpar
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                  Prévia 58mm
                </div>

                <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                  Etiqueta
                </h2>
              </div>

              <QrCode className="text-evtag-primary" size={24} />
            </div>

            <div className="flex justify-center">
              <div className="flex min-h-[360px] w-[330px] flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 font-sans text-[13px] text-black shadow-md">
                <div>
                  <div className="text-base font-black uppercase leading-tight">
                    {selectedItem?.name || 'Produto'}
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="text-[9px] font-black uppercase">
                      Produção / Manipulação
                    </div>

                    <div className="text-[10px] font-black">
                      {formatWeight(weight, weightUnit)}
                    </div>
                  </div>
                </div>

                <div className="border-t border-black" />

                <div>
                  <PreviewRow label="LOTE:" value={lot || '-'} />
                  <PreviewRow label="QTD.:" value={String(quantity)} />
                  <PreviewRow label="VAL. ORIGINAL:" value={originalDate ? formatDate(`${originalDate}T00:00:00`) : '-'} />
                  <PreviewRow label="MANIPULAÇÃO:" value={formatDateTime(new Date().toISOString())} />
                  <PreviewRow label="VALIDADE:" value={validityPreview} />
                  <PreviewRow label="MARCA / FORN.:" value={brandOrSupplier || '-'} />
                  <PreviewRow label="SIF:" value={sif || '-'} />
                </div>

                <div className="border-t border-black" />

                <div className="flex items-end justify-between gap-2">
                  <div className="text-[8.5px] font-semibold leading-tight">
                    <div><strong>RESP.:</strong> {responsible || '-'}</div>
                    <div>EMPRESA CADASTRADA</div>
                    <div>CNPJ: -</div>
                    <div>CEP: -</div>
                    <div>ENDEREÇO CADASTRADO</div>
                    <div className="mt-1 text-[8px] font-black">#EVTAG</div>
                  </div>

                  {showQr ? (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center border border-black text-[10px] font-black">
                      QR
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                  Atalhos
                </div>

                <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                  Favoritos
                </h2>
              </div>

              <Star className="text-amber-500" size={24} />
            </div>

            <div className="grid gap-2">
              {favoriteItems.length === 0 ? (
                <EmptyCard message="Nenhum favorito." />
              ) : (
                favoriteItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item.id)}
                    className="flex items-center justify-between rounded-2xl border border-evtag-border bg-evtag-bg px-4 py-3 text-left transition hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-evtag-text">{item.name}</p>
                      <p className="mt-0.5 truncate text-xs text-evtag-muted">{item.category?.name ?? 'Sem categoria'}</p>
                    </div>

                    <BadgeCheck size={18} className="shrink-0 text-evtag-primary" />
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                  Sessão
                </div>

                <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                  Últimas impressões
                </h2>
              </div>

              <Clock3 className="text-evtag-primary" size={24} />
            </div>

            <div className="grid gap-2">
              {recentPrints.length === 0 ? (
                <EmptyCard message="Nenhuma impressão nesta sessão." />
              ) : (
                recentPrints.map((recent) => (
                  <button
                    key={recent.id}
                    type="button"
                    onClick={() => selectItem(recent.itemId)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-evtag-border bg-evtag-bg px-4 py-3 text-left transition hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-evtag-text">
                        {recent.itemName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-evtag-muted">
                        {recent.copies} cópia(s) · {formatDateTime(recent.printedAt)}
                      </p>
                    </div>

                    <Copy size={17} className="shrink-0 text-evtag-muted" />
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function PageHeader({
  isLoading,
  isPrinting,
  onRefresh,
  totalProducts,
  lastPrint,
  onReprint,
}: {
  isLoading: boolean;
  isPrinting: boolean;
  onRefresh: () => Promise<void>;
  totalProducts: number;
  lastPrint: PrintResponse | null;
  onReprint: () => Promise<void>;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-evtag-text">
          Impressão de etiquetas
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-evtag-muted">
          Estação rápida para geração de etiquetas de produção, validade e rastreabilidade.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <HeaderStat label="Produtos" value={totalProducts} />

        <button
          type="button"
          onClick={() => void onReprint()}
          disabled={!lastPrint || isPrinting}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-evtag-border bg-white px-5 text-sm font-bold text-evtag-text transition hover:bg-evtag-bg disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Copy size={17} />
          Reimprimir
        </button>

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

type InputProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
};

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  min,
}: InputProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-evtag-text">{label}</span>

      <input
        type={type}
        min={min}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
      />
    </label>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[10px] leading-tight">
      <span className="font-black">{label}</span>
      <strong className="text-right font-bold">{value}</strong>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-evtag-border bg-evtag-bg px-4 py-5 text-center text-sm text-evtag-muted">
      {message}
    </div>
  );
}
