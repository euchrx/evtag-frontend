import { useCallback, useMemo, useRef, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
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

export function ScanPage() {
  const [qrCode, setQrCode] = useState('');
  const [print, setPrint] = useState<LabelPrint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanLocked, setIsScanLocked] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const unlockTimeoutRef = useRef<number | null>(null);

  const canSearch = useMemo(() => qrCode.trim().length > 0, [qrCode]);

  const playBeep = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);

      gainNode.gain.setValueAtTime(0.001, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
    } catch (error) {
      console.error('Não foi possível reproduzir o beep:', error);
    }
  }, []);

  const releaseScanLock = useCallback(() => {
    if (unlockTimeoutRef.current) {
      window.clearTimeout(unlockTimeoutRef.current);
    }

    unlockTimeoutRef.current = window.setTimeout(() => {
      setIsScanLocked(false);
    }, 1800);
  }, []);

  async function handleSearch(value?: string) {
    const code = (value ?? qrCode).trim();

    if (!code) return;

    try {
      setIsLoading(true);

      const response = await api.get<LabelPrint>(
        `/labels/prints/qr/${encodeURIComponent(code)}`,
      );

      setQrCode(code);
      setPrint(response.data);
    } catch (error) {
      console.error('Erro ao buscar etiqueta:', error);
      alert('Etiqueta não encontrada.');
      setPrint(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(status: LabelPrintStatus) {
    if (!print) return;

    try {
      setIsUpdating(true);

      await api.patch(`/labels/prints/${print.id}/status`, { status });

      const response = await api.get<LabelPrint>(
        `/labels/prints/qr/${encodeURIComponent(print.qrCode)}`,
      );

      setPrint(response.data);
    } catch (error) {
      console.error('Erro ao atualizar etiqueta:', error);
      alert('Não foi possível atualizar o status.');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDetectedCode(rawValue?: string) {
    const value = rawValue?.trim();

    if (!value || isScanLocked) return;
    if (value === lastScannedCode) return;

    setIsScanLocked(true);
    setLastScannedCode(value);
    setQrCode(value);
    playBeep();

    await handleSearch(value);
    releaseScanLock();
  }

  function handleAllowNewScan() {
    setIsScanLocked(false);
    setLastScannedCode('');
    setPrint(null);
    setQrCode('');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Conferência por QR Code
        </h1>
        <p className="text-sm text-slate-600">
          Consulte a etiqueta e atualize o status operacional.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <input
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            placeholder="Cole ou bip o QR Code"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
          />

          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={isLoading || !canSearch}
            className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsScannerOpen((prev) => !prev)}
            className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300"
          >
            {isScannerOpen ? 'Fechar câmera' : 'Abrir câmera'}
          </button>

          <button
            type="button"
            onClick={handleAllowNewScan}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Liberar nova leitura
          </button>
        </div>

        {isScannerOpen ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <Scanner
              formats={['qr_code']}
              constraints={{ facingMode: 'environment' }}
              onScan={(detectedCodes) => {
                const value = detectedCodes?.[0]?.rawValue;
                void handleDetectedCode(value);
              }}
              onError={(error) => {
                console.error('Erro no scanner:', error);
              }}
            />
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-1 font-semibold ${
              isScannerOpen
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {isScannerOpen ? 'Câmera ativa' : 'Câmera desligada'}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 font-semibold ${
              isScanLocked
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {isScanLocked ? 'Leitura temporariamente travada' : 'Leitura liberada'}
          </span>
        </div>
      </section>

      {print ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {print.labelItem.name}
              </h2>
              <p className="text-sm text-slate-500">
                {print.labelItem.category.name}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Preparo
                </div>
                <div className="text-sm text-slate-900">
                  {formatDateTime(print.preparedAt)}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Validade
                </div>
                <div className="text-sm text-slate-900">
                  {formatDateTime(print.expiresAt)}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Lote
                </div>
                <div className="text-sm text-slate-900">
                  {print.lot ?? '-'}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Status
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(print.status)}`}
                  >
                    {getStatusLabel(print.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase text-slate-500">
                QR Code
              </div>
              <div className="mt-1 break-all text-sm text-slate-900">
                {print.qrCode}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => updateStatus('CONSUMED')}
                disabled={isUpdating}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                Marcar como consumida
              </button>

              <button
                type="button"
                onClick={() => updateStatus('DISCARDED')}
                disabled={isUpdating}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                Marcar como descartada
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}