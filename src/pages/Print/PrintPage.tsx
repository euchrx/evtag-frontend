import { useEffect, useState } from 'react';
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

type LabelPrintResponse = {
  id: string;
  labelItemId: string;
  preparedAt: string;
  expiresAt: string;
  quantity: number | null;
  weight: string | null;
  lot: string | null;
  qrCode: string;
  status: 'ACTIVE' | 'EXPIRED' | 'DISCARDED' | 'CONSUMED';
  createdAt: string;
  updatedAt: string;
  labelItem: LabelItem;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

export function PrintPage() {
  const [items, setItems] = useState<LabelItem[]>([]);
  const [selected, setSelected] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState('');
  const [lot, setLot] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    void loadItems();
  }, []);

  async function loadItems() {
    try {
      setIsLoading(true);
      const response = await api.get<LabelItem[]>('/labels/items');
      setItems(response.data);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      alert('Não foi possível carregar os itens.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePrint() {
    if (!selected || isPrinting || quantity < 1) {
      return;
    }

    try {
      setIsPrinting(true);

      const response = await api.post<LabelPrintResponse>('/labels/print', {
        labelItemId: selected,
        quantity,
        weight: weight ? Number(weight) : undefined,
        lot: lot.trim() || undefined,
      });

      const data = response.data;
      const qrBase64 = await QRCode.toDataURL(data.qrCode, {
        margin: 1,
        width: 160,
      });

      const printWindow = window.open('', '_blank', 'width=420,height=700');

      if (!printWindow) {
        alert('Não foi possível abrir a janela de impressão.');
        return;
      }

      let labelsHtml = '';

      for (let index = 0; index < quantity; index += 1) {
        labelsHtml += `
          <div class="label">
            <div class="title">${data.labelItem.name}</div>

            <div class="divider"></div>

            <div class="line"><strong>Categoria:</strong> ${data.labelItem.category.name}</div>
            <div class="line"><strong>Preparo:</strong> ${formatDateTime(data.preparedAt)}</div>
            <div class="expire"><strong>Validade:</strong> ${formatDateTime(data.expiresAt)}</div>
            <div class="line"><strong>Lote:</strong> ${data.lot ?? '-'}</div>
            <div class="line"><strong>Peso:</strong> ${data.weight ?? '-'}</div>

            <div class="qr">
              <img src="${qrBase64}" alt="QR Code da etiqueta" />
            </div>

            <div class="code">${data.qrCode}</div>
          </div>
        `;
      }

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
            <title>Etiquetas</title>
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
                page-break-after: always;
              }

              .label:last-child {
                page-break-after: auto;
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
            </style>
          </head>
          <body>
            ${labelsHtml}

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
      console.error('Erro ao imprimir etiqueta:', error);
      alert('Não foi possível gerar a etiqueta.');
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Impressão</h1>
        <p className="text-sm text-slate-600">
          Gere etiquetas de validade de forma rápida.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Nova impressão
          </h2>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Item</span>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
                disabled={isLoading || isPrinting}
              >
                <option value="">Selecione um item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Quantidade de etiquetas
              </span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
                disabled={isPrinting}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Peso</span>
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ex.: 0.500"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
                disabled={isPrinting}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Lote</span>
              <input
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                placeholder="Ex.: LOTE-001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
                disabled={isPrinting}
              />
            </label>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!selected || isPrinting || isLoading || quantity < 1}
              className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPrinting ? 'Imprimindo...' : 'Imprimir etiquetas'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Orientações
          </h2>

          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Selecione um item já cadastrado para gerar a etiqueta com validade
              automática.
            </p>
            <p>
              O campo <strong>peso</strong> é opcional e pode ser usado para
              carnes, hortifruti fracionado e produtos porcionados.
            </p>
            <p>
              O campo <strong>lote</strong> é opcional e ajuda na
              rastreabilidade da produção.
            </p>
            <p>
              A quantidade define quantas etiquetas iguais serão enviadas para
              impressão.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}