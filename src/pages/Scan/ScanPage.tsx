import { useCallback, useMemo, useRef, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  CheckCircle2,
  Eraser,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type LabelPrintStatus = 'ACTIVE' | 'EXPIRED' | 'DISCARDED' | 'CONSUMED';
type ScanResult = 'success' | 'error' | null;
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

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function formatDateOnly(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toISOString().slice(0, 10);
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

function playBeep(type: 'success' | 'error' = 'success') {
  try {
    const audioWindow = window as AudioWindow;
    const AudioContextConstructor =
      window.AudioContext ?? audioWindow.webkitAudioContext;

    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = type === 'success' ? 900 : 220;
    gain.gain.value = type === 'success' ? 0.08 : 0.12;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  } catch {
    // feedback sonoro auxiliar
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
  const [scanResult, setScanResult] = useState<ScanResult>(null);

  const unlockTimeoutRef = useRef<number | null>(null);
  const { showToast } = useToast();

  const canSearch = useMemo(() => qrCode.trim().length > 0, [qrCode]);

  const expirationState = useMemo(
    () => (print ? getExpirationState(print.expiresAt) : null),
    [print],
  );

  const releaseScanLock = useCallback(() => {
    if (unlockTimeoutRef.current) {
      window.clearTimeout(unlockTimeoutRef.current);
    }

    unlockTimeoutRef.current = window.setTimeout(() => {
      setIsScanLocked(false);
    }, 1500);
  }, []);

  async function handleSearch(value?: string) {
    const code = (value ?? qrCode).trim();

    if (!code) return;

    try {
      setIsLoading(true);

      const { data } = await api.get<LabelPrint>(
        `/labels/prints/qr/${encodeURIComponent(code)}`,
      );

      setPrint(data);
      setQrCode(code);
      setScanResult('success');
      playBeep('success');
    } catch (error) {
      setPrint(null);
      setScanResult('error');
      playBeep('error');
      showToast(getErrorMessage(error, 'Etiqueta não encontrada'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(status: LabelPrintStatus) {
    if (!print) return;

    try {
      setIsUpdating(true);

      await api.patch(`/labels/prints/${print.id}/status`, { status });

      const { data } = await api.get<LabelPrint>(
        `/labels/prints/qr/${encodeURIComponent(print.qrCode)}`,
      );

      setPrint(data);
      showToast('Status atualizado com sucesso.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao atualizar status'), 'error');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDetectedCode(raw?: string) {
    const value = raw?.trim();

    if (!value || isScanLocked) return;
    if (value === lastScannedCode) return;

    setIsScanLocked(true);
    setLastScannedCode(value);
    setQrCode(value);

    await handleSearch(value);
    releaseScanLock();
  }

  function resetScan() {
    setPrint(null);
    setQrCode('');
    setScanResult(null);
    setLastScannedCode('');
    setIsScanLocked(false);
  }

  return (
    <div className="space-y-8 font-sans">
      <PageHeader onReset={resetScan} />

      {scanResult ? <ScanAlert result={scanResult} /> : null}

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                  Leitura
                </div>

                <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                  Buscar etiqueta
                </h2>

                <p className="mt-2 text-sm leading-6 text-evtag-muted">
                  Informe o QR Code manualmente ou utilize a câmera do
                  dispositivo.
                </p>
              </div>

              <div className="rounded-2xl bg-evtag-primary p-3 text-white">
                <ScanLine size={22} />
              </div>
            </div>

            <div className="space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-evtag-text">
                  QR Code
                </span>

                <input
                  value={qrCode}
                  onChange={(event) => setQrCode(event.target.value)}
                  placeholder="Digite ou leia o QR Code"
                  className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={!canSearch || isLoading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <RefreshCw size={17} className="animate-spin" />
                ) : (
                  <Search size={17} />
                )}
                {isLoading ? 'Buscando...' : 'Buscar etiqueta'}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen((current) => !current)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-evtag-border bg-white px-4 text-sm font-bold text-evtag-text transition hover:bg-evtag-light"
                >
                  <QrCode size={17} />
                  {isScannerOpen ? 'Fechar câmera' : 'Abrir câmera'}
                </button>

                <button
                  type="button"
                  onClick={resetScan}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-evtag-border bg-white px-4 text-sm font-bold text-evtag-text transition hover:bg-evtag-light"
                >
                  <Eraser size={17} />
                  Limpar
                </button>
              </div>
            </div>
          </div>

          {isScannerOpen ? (
            <div className="overflow-hidden rounded-[2rem] border border-evtag-border bg-white shadow-sm">
              <div className="border-b border-evtag-border px-6 py-5">
                <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                  Câmera
                </div>

                <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                  Leitor de QR Code
                </h2>

                <p className="mt-2 text-sm leading-6 text-evtag-muted">
                  Aponte a câmera para a etiqueta. A leitura é feita
                  automaticamente.
                </p>
              </div>

              <div className="bg-black">
                <Scanner
                  formats={['qr_code']}
                  constraints={{ facingMode: 'environment' }}
                  onScan={(codes) => {
                    const value = codes?.[0]?.rawValue;
                    void handleDetectedCode(value);
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <section className="rounded-[2rem] border border-evtag-border bg-white shadow-sm">
          <div className="border-b border-evtag-border px-6 py-5">
            <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
              Conferência
            </div>

            <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
              Resultado da conferência
            </h2>

            <p className="mt-2 text-sm leading-6 text-evtag-muted">
              Dados operacionais da etiqueta consultada.
            </p>
          </div>

          {!print ? (
            <div className="flex min-h-[360px] items-center justify-center p-8 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-evtag-light text-evtag-primary">
                  <ShieldCheck size={28} />
                </div>

                <p className="font-display text-lg font-extrabold text-evtag-text">
                  Nenhuma etiqueta consultada
                </p>

                <p className="mt-2 max-w-sm text-sm leading-6 text-evtag-muted">
                  Digite o QR Code ou utilize a câmera para carregar os dados da
                  etiqueta.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <div className="rounded-[1.5rem] bg-evtag-bg p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-black text-evtag-text">
                      {print.labelItem.name}
                    </h3>

                    <p className="mt-1 text-sm font-medium text-evtag-muted">
                      {print.labelItem.category.name}
                    </p>

                    <p className="mt-2 max-w-xl truncate text-xs font-medium text-evtag-muted/80">
                      QR: {print.qrCode}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={print.status} />

                    {expirationState ? (
                      <ExpirationBadge state={expirationState} />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  label="Preparo"
                  value={formatDateOnly(print.preparedAt)}
                />
                <InfoCard
                  label="Validade"
                  value={formatDateOnly(print.expiresAt)}
                />
                <InfoCard label="Lote" value={print.lot || '-'} />
                <InfoCard label="Peso" value={print.weight || '-'} />
              </div>

              <div className="grid gap-3 border-t border-evtag-border pt-6 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void updateStatus('CONSUMED')}
                  disabled={isUpdating || print.status === 'CONSUMED'}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 size={17} />
                  {isUpdating ? 'Atualizando...' : 'Marcar como consumida'}
                </button>

                <button
                  type="button"
                  onClick={() => void updateStatus('DISCARDED')}
                  disabled={isUpdating || print.status === 'DISCARDED'}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={17} />
                  {isUpdating ? 'Atualizando...' : 'Marcar como descartada'}
                </button>
              </div>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function PageHeader({ onReset }: { onReset: () => void }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-evtag-text">
          Conferência
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-evtag-muted">
          Consulte, valide, consuma ou descarte etiquetas por QR Code.
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark"
      >
        <ScanLine size={17} />
        Nova leitura
      </button>
    </header>
  );
}

function ScanAlert({ result }: { result: ScanResult }) {
  const success = result === 'success';

  return (
    <section
      className={`rounded-[1.5rem] border px-5 py-4 text-sm font-bold shadow-sm ${
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      <div className="flex items-center gap-3">
        {success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
        {success
          ? 'Etiqueta localizada com sucesso.'
          : 'Etiqueta não encontrada.'}
      </div>
    </section>
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-evtag-bg px-4 py-3 ring-1 ring-evtag-border">
      <p className="text-[10px] font-black uppercase tracking-wide text-evtag-muted">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-evtag-text">{value}</p>
    </div>
  );
}