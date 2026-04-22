import { useEffect, useState } from 'react';
import * as QRCode from 'qrcode';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

export function PrintPage() {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState('');
  const [lot, setLot] = useState('');
  const [showQr, setShowQr] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    void loadItems();
  }, []);

  async function loadItems() {
    try {
      setIsLoading(true);
      const res = await api.get('/labels/items');
      setItems(res.data);
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao carregar itens'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setSelected('');
    setQuantity(1);
    setWeight('');
    setLot('');
  }

  async function handlePrint() {
    if (!selected || quantity < 1) {
      showToast('Selecione um item válido', 'warning');
      return;
    }

    try {
      setIsPrinting(true);

      const { data } = await api.post('/labels/prints', {
        labelItemId: selected,
        quantity,
        weight: weight ? Number(weight) : undefined,
        lot: lot.trim() || undefined,
      });

      const qrBase64 = await QRCode.toDataURL(data.qrCode, {
        margin: 0,
        width: 200,
      });

      const win = window.open('', '_blank', 'width=420,height=700');

      if (!win) {
        showToast('Bloqueador de popup ativo', 'error');
        return;
      }

      let labels = '';

      for (let i = 0; i < quantity; i++) {
        labels += `
          <div class="label">
            <div class="title">${data.labelItem.name}</div>

            <div class="divider"></div>

            <div class="line">PREP: ${format(data.preparedAt)}</div>

            <div class="expire">
              VAL: ${format(data.expiresAt)} (${getDays(data.expiresAt)}d)
            </div>

            <div class="line">LOTE: ${data.lot ?? '-'}</div>
            <div class="line">PESO: ${data.weight ?? '-'}</div>

            ${
              showQr
                ? `
              <div class="qr">
                <img src="${qrBase64}" />
              </div>

              <div class="code">${data.qrCode}</div>
            `
                : ''
            }
          </div>
        `;
      }

      win.document.write(`
        <html>
          <head>
            <style>
              @page { size: 58mm auto; margin: 0; }

              body {
                width: 58mm;
                margin: 0;
                font-family: monospace;
                font-size: 12px;
                letter-spacing: 0.5px;
              }

              .label {
                padding: 3mm;
                page-break-after: always;
              }

              .title {
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
              }

              .divider {
                border-top: 1px dashed #000;
                margin: 4px 0;
              }

              .line {
                font-size: 11px;
                margin: 2px 0;
              }

              .expire {
                font-size: 13px;
                font-weight: bold;
                margin: 4px 0;
              }

              .qr {
                text-align: center;
                margin-top: 6px;
              }

              .qr img {
                width: 90px;
                height: 90px;
              }

              .code {
                text-align: center;
                font-size: 9px;
                margin-top: 4px;
                word-break: break-all;
              }
            </style>
          </head>
          <body>
            ${labels}
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 300);
              }
            </script>
          </body>
        </html>
      `);

      showToast('Etiquetas geradas com sucesso', 'success');
      resetForm();
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao imprimir'), 'error');
    } finally {
      setIsPrinting(false);
    }
  }

  function format(date: string) {
    return new Date(date).toLocaleDateString('pt-BR');
  }

  function getDays(date: string) {
    const now = new Date();
    const target = new Date(date);
    const diff = target.getTime() - now.getTime();
    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Impressão</h1>
        <p className="text-sm text-slate-600">
          Gere etiquetas para os itens cadastrados.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Gerar etiquetas
          </h2>

          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Selecione</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />

          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Peso"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />

          <input
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            placeholder="Lote"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />

          {/* 🔥 NOVO */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showQr}
              onChange={(e) => setShowQr(e.target.checked)}
            />
            Imprimir com QR Code
          </label>

          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
          >
            {isPrinting ? 'Imprimindo...' : 'Imprimir etiquetas'}
          </button>
        </section>
      </div>
    </div>
  );
}