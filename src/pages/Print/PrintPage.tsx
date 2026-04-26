import { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';
import { Printer, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type WeightUnit = 'g' | 'kg';

type LabelItem = {
  id: string;
  name: string;
};

type PrintResponse = {
  qrCode: string;
  labelItem: {
    name: string;
  };
  preparedAt: string;
  expiresAt: string;
  lot?: string | null;
  weight?: number | null;
};

function formatDate(value?: string | null) {
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

function formatWeight(value?: string | number | null, unit: WeightUnit = 'g') {
  if (value === null || value === undefined || value === '') return '-';

  const numeric = Number(value);

  if (Number.isNaN(numeric)) return '-';

  return `${numeric}${unit}`;
}

function getShortCode(qrCode: string) {
  return qrCode.replace(/[^a-zA-Z0-9]/g, '').slice(-7).toUpperCase() || 'EVTAG';
}

export function PrintPage() {
  const [items, setItems] = useState<LabelItem[]>([]);
  const [selected, setSelected] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('g');
  const [lot, setLot] = useState('');
  const [showQr, setShowQr] = useState(true);

  const [originalDate, setOriginalDate] = useState('');
  const [brandOrSupplier, setBrandOrSupplier] = useState('SWIFT');
  const [sif, setSif] = useState('358');
  const [responsible, setResponsible] = useState('LUCIANA');
  const [companyName, setCompanyName] = useState('PADRÃO SUFLEX');
  const [cnpj, setCnpj] = useState('12.345.678/0001-12');
  const [cep, setCep] = useState('05435-030');
  const [street, setStreet] = useState('PURPURINA, 400');

  const [lastPrint, setLastPrint] = useState<PrintResponse | null>(null);
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

  function resetForm() {
    setSelected('');
    setQuantity(1);
    setWeight('');
    setWeightUnit('g');
    setLot('');
    setOriginalDate('');
    setBrandOrSupplier('SWIFT');
    setSif('358');
  }

  async function handlePrint() {
    if (!selected || quantity < 1) {
      showToast('Selecione um produto e informe uma quantidade válida.', 'warning');
      return;
    }

    const parsedWeight = weight.trim() ? Number(weight) : undefined;

    if (parsedWeight !== undefined && Number.isNaN(parsedWeight)) {
      showToast('Informe um peso válido.', 'warning');
      return;
    }

    try {
      setIsPrinting(true);

      const { data } = await api.post<PrintResponse>('/labels/prints', {
        labelItemId: selected,
        quantity,
        weight: parsedWeight,
        lot: lot.trim() || undefined,
      });

      setLastPrint(data);

      const qrBase64 = await QRCode.toDataURL(data.qrCode, {
        margin: 0,
        width: 220,
      });

      const win = window.open('', '_blank', 'width=420,height=700');

      if (!win) {
        showToast('Bloqueador de popup ativo.', 'error');
        return;
      }

      const formattedWeight = formatWeight(data.weight ?? weight, weightUnit);
      const manipulationDate = formatDateTime(data.preparedAt);
      const expirationDate = formatDateTime(data.expiresAt);
      const originalExpirationDate = originalDate
        ? formatDateTime(`${originalDate}T00:00:00`)
        : formatDate(data.expiresAt);
      const shortCode = getShortCode(data.qrCode);

      let labels = '';

      for (let index = 0; index < quantity; index += 1) {
        labels += `
          <div class="label">
            <div class="top">
              <div class="product">${data.labelItem.name}</div>
            </div>

            <div class="subtitle-row">
              <div class="subtitle">RESFRIADO / DESCONGELANDO</div>
              <div class="weight">${formattedWeight}</div>
            </div>

            <div class="rule"></div>

            <div class="row">
              <span>VAL. ORIGINAL:</span>
              <strong>${originalExpirationDate}</strong>
            </div>

            <div class="row">
              <span>MANIPULAÇÃO:</span>
              <strong>${manipulationDate}</strong>
            </div>

            <div class="row">
              <span>VALIDADE:</span>
              <strong>${expirationDate}</strong>
            </div>

            <div class="row">
              <span>MARCA / FORN:</span>
              <strong>${brandOrSupplier || '-'}</strong>
            </div>

            <div class="row">
              <span>SIF:</span>
              <strong>${sif || '-'}</strong>
            </div>

            <div class="rule"></div>

            <div class="bottom">
              <div class="info">
                <div><strong>RESP.:</strong> ${responsible || '-'}</div>
                <div>RESTAURANTE ${companyName || '-'}</div>
                <div>CNPJ: ${cnpj || '-'}</div>
                <div>CEP: ${cep || '-'}</div>
                <div>RUA ${street || '-'}</div>
                <div>SÃO PAULO - SP</div>
                <div class="code-text">#${shortCode}</div>
              </div>

              ${
                showQr
                  ? `
                    <div class="qr">
                      <img src="${qrBase64}" />
                    </div>
                  `
                  : ''
              }
            </div>
          </div>
        `;
      }

      win.document.write(`
        <html>
          <head>
            <title>Impressão de etiqueta</title>
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

              .top {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 4px;
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

              .info strong {
                font-weight: 900;
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
            </style>
          </head>

          <body>
            ${labels}

            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 300);
              };
            </script>
          </body>
        </html>
      `);

      win.document.close();

      showToast('Etiquetas geradas com sucesso.', 'success');
      resetForm();
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao imprimir etiquetas'), 'error');
    } finally {
      setIsPrinting(false);
    }
  }

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selected) ?? null,
    [items, selected],
  );

  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        isLoading={isLoading}
        onRefresh={loadItems}
        totalProducts={items.length}
      />

      <section className="space-y-6">
        <div className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <StepItem
              number="1"
              title="Escolha o produto"
              description="Selecione o item que será etiquetado."
              active
            />
            <StepItem
              number="2"
              title="Preencha os dados"
              description="Informe peso, lote, validade e responsável."
            />
            <StepItem
              number="3"
              title="Imprima"
              description="Gere a etiqueta e envie para a impressora térmica."
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">
          <div className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                  Geração
                </div>

                <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                  Nova impressão
                </h2>

                <p className="mt-2 text-sm leading-6 text-evtag-muted">
                  Preencha os dados da etiqueta conforme o padrão operacional.
                </p>
              </div>

              <div className="rounded-2xl bg-evtag-primary p-3 text-white">
                <Printer size={22} />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-bold text-evtag-text">Produto</span>

                <select
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                  disabled={isLoading}
                  className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="">Selecione um produto</option>

                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <Input
                label="Quantidade"
                type="number"
                min={1}
                value={quantity}
                onChange={(value) => setQuantity(Math.max(1, Number(value)))}
              />

              <div className="grid grid-cols-[1fr_110px] gap-3">
                <Input
                  label="Peso"
                  value={weight}
                  onChange={setWeight}
                  placeholder="Ex.: 250"
                />

                <label className="block space-y-2">
                  <span className="text-sm font-bold text-evtag-text">
                    Unidade
                  </span>

                  <select
                    value={weightUnit}
                    onChange={(event) =>
                      setWeightUnit(event.target.value as WeightUnit)
                    }
                    className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </label>
              </div>

              <Input
                label="Lote"
                value={lot}
                onChange={setLot}
                placeholder="Opcional"
              />

              <Input
                label="Validade original"
                type="date"
                value={originalDate}
                onChange={setOriginalDate}
              />

              <Input
                label="Marca / Fornecedor"
                value={brandOrSupplier}
                onChange={setBrandOrSupplier}
              />

              <Input label="SIF" value={sif} onChange={setSif} />

              <Input
                label="Responsável"
                value={responsible}
                onChange={setResponsible}
              />

              <Input
                label="Empresa / Restaurante"
                value={companyName}
                onChange={setCompanyName}
              />

              <Input label="CNPJ" value={cnpj} onChange={setCnpj} />

              <div className="grid grid-cols-[1fr_130px] gap-3">
                <Input label="Rua" value={street} onChange={setStreet} />
                <Input label="CEP" value={cep} onChange={setCep} />
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-evtag-border bg-evtag-bg px-4 py-3 md:col-span-2">
                <div>
                  <p className="text-sm font-bold text-evtag-text">
                    Imprimir QR Code
                  </p>
                  <p className="mt-0.5 text-xs text-evtag-muted">
                    Recomendado para conferência e rastreabilidade.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={showQr}
                  onChange={(event) => setShowQr(event.target.checked)}
                  className="h-5 w-5 accent-[#3C0061]"
                />
              </label>

              <button
                type="button"
                onClick={() => void handlePrint()}
                disabled={isPrinting || isLoading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
              >
                <Printer size={17} />
                {isPrinting ? 'Gerando etiquetas...' : 'Imprimir etiquetas'}
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-rows-2">
            <section className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
              <div className="mb-6">
                <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                  Prévia
                </div>

                <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                  Prévia da etiqueta
                </h2>

                <p className="mt-2 max-w-[260px] text-sm leading-6 text-evtag-muted">
                  Visual aproximado da etiqueta térmica
                  <br />
                  antes da impressão.
                </p>
              </div>

              <div className="-mt-16 flex justify-end pr-2">
                <div className="flex h-[300px] w-[360px] flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 font-sans text-[13px] text-black shadow-md">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-base font-black uppercase leading-tight">
                        {selectedItem?.name || 'Produto'}
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-3">
                      <div className="text-[9px] font-black uppercase">
                        Resfriado / Descongelando
                      </div>

                      <div className="text-[10px] font-black">
                        {formatWeight(weight, weightUnit)}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-black" />

                  <div>
                    <PreviewRow label="VAL. ORIGINAL:" value={originalDate || '-'} />
                    <PreviewRow
                      label="MANIPULAÇÃO:"
                      value={formatDateTime(new Date().toISOString())}
                    />
                    <PreviewRow label="VALIDADE:" value="Definida pelo produto" />
                    <PreviewRow label="MARCA / FORN:" value={brandOrSupplier || '-'} />
                    <PreviewRow label="SIF:" value={sif || '-'} />
                  </div>

                  <div className="border-t border-black" />

                  <div className="flex items-end justify-between gap-2">
                    <div className="text-[8.5px] font-semibold leading-tight">
                      <div>
                        <strong>RESP.:</strong> {responsible || '-'}
                      </div>
                      <div>RESTAURANTE {companyName || '-'}</div>
                      <div>CNPJ: {cnpj || '-'}</div>
                      <div>CEP: {cep || '-'}</div>
                      <div>RUA {street || '-'}</div>
                      <div>SÃO PAULO - SP</div>
                      <div className="mt-1 text-[8px] font-black">#EVTAG</div>
                    </div>

                    {showQr ? (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center border border-black">
                        QR
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
              <div className="mb-6">
                <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                  Resultado
                </div>

                <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                  Última etiqueta
                </h2>

                <p className="mt-2 text-sm leading-6 text-evtag-muted">
                  Informações da última etiqueta gerada nesta sessão.
                </p>
              </div>

              {lastPrint ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoCard label="Produto" value={lastPrint.labelItem.name} />
                  <InfoCard label="Validade" value={formatDate(lastPrint.expiresAt)} />
                  <InfoCard label="Lote" value={lastPrint.lot || '-'} />
                  <InfoCard
                    label="Peso"
                    value={formatWeight(lastPrint.weight ?? weight, weightUnit)}
                  />
                  <InfoCard label="QR Code" value={lastPrint.qrCode} />
                  <InfoCard
                    label="Preparado em"
                    value={formatDateTime(lastPrint.preparedAt)}
                  />
                </div>
              ) : (
                <div className="flex min-h-[180px] items-center justify-center rounded-[1.5rem] border border-dashed border-evtag-border bg-evtag-bg p-8 text-center">
                  <div>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-evtag-light text-evtag-primary">
                      <Printer size={24} />
                    </div>

                    <p className="font-display text-lg font-extrabold text-evtag-text">
                      Nenhuma etiqueta gerada ainda
                    </p>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-evtag-muted">
                      Após imprimir, os principais dados aparecerão aqui.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function PageHeader({
  isLoading,
  onRefresh,
  totalProducts,
}: {
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  totalProducts: number;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-evtag-text">
          Etiquetas
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-evtag-muted">
          Gere etiquetas de identificação, validade e rastreabilidade para os
          produtos cadastrados.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <HeaderStat label="Produtos" value={totalProducts} />

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

function StepItem({
  number,
  title,
  description,
  active = false,
}: {
  number: string;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        active
          ? 'border-evtag-primary bg-evtag-light'
          : 'border-evtag-border bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-display text-sm font-black ${
            active
              ? 'bg-evtag-primary text-white'
              : 'bg-evtag-light text-evtag-primary'
          }`}
        >
          {number}
        </div>

        <div>
          <p className="font-display text-sm font-extrabold text-evtag-text">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-evtag-muted">
            {description}
          </p>
        </div>
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-evtag-bg px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-evtag-muted">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-evtag-text">{value}</p>
    </div>
  );
}