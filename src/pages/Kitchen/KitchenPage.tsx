import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Keyboard,
  Loader2,
  Lock,
  RotateCcw,
  ScanLine,
  Settings,
  ShieldCheck,
  TabletSmartphone,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { getErrorMessage } from '../../utils/getErrorMessage';

type ProductionStatus =
  | 'idle'
  | 'processing'
  | 'success'
  | 'expired'
  | 'consumed'
  | 'discarded'
  | 'not_found'
  | 'device_error'
  | 'error';

type MobileLookupResponse = {
  found: boolean;
  id?: string;
  qrCode?: string;
  status?: 'ACTIVE' | 'EXPIRED' | 'DISCARDED' | 'CONSUMED' | 'NOT_FOUND' | string;
  canConsume: boolean;
  isExpired: boolean;
  message?: string;
  labelItem?: {
    id: string;
    name: string;
    type?: string;
    category?: {
      id: string;
      name: string;
    };
  };
  company?: {
    id: string;
    name: string;
  };
  preparedAt?: string | null;
  expiresAt?: string | null;
  quantity?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
  lot?: string | null;
  brandOrSupplier?: string | null;
  sif?: string | null;
  responsible?: string | null;
};

type ConsumeResponse = {
  success: boolean;
  id: string;
  status: string;
  consumedAt?: string | null;
  itemName?: string;
  message?: string;
};

type ScanLog = {
  id: string;
  time: string;
  status: ProductionStatus;
  title: string;
  description: string;
};

const DEVICE_ID_KEY = 'evtag_device_id';
const RESPONSIBLE_KEY = 'evtag_kitchen_responsible';
const AUTO_RESET_MS = 1800;

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function normalizeDeviceId(value: string) {
  return value.trim();
}

function getStatusFromLookup(data: MobileLookupResponse): ProductionStatus {
  if (!data.found) return 'not_found';
  if (data.isExpired || data.status === 'EXPIRED') return 'expired';
  if (data.status === 'CONSUMED') return 'consumed';
  if (data.status === 'DISCARDED') return 'discarded';
  if (!data.canConsume) return 'error';
  return 'success';
}

export function KitchenPage() {
  const [deviceId, setDeviceId] = useState(() =>
    localStorage.getItem(DEVICE_ID_KEY) ?? '',
  );
  const [draftDeviceId, setDraftDeviceId] = useState(() =>
    localStorage.getItem(DEVICE_ID_KEY) ?? '',
  );
  const [responsible, setResponsible] = useState(() =>
    localStorage.getItem(RESPONSIBLE_KEY) ?? '',
  );
  const [draftResponsible, setDraftResponsible] = useState(() =>
    localStorage.getItem(RESPONSIBLE_KEY) ?? '',
  );
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<ProductionStatus>('idle');
  const [lastLookup, setLastLookup] = useState<MobileLookupResponse | null>(null);
  const [lastConsume, setLastConsume] = useState<ConsumeResponse | null>(null);
  const [message, setMessage] = useState('Aguardando leitura');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  const hasDevice = Boolean(normalizeDeviceId(deviceId));

  const deviceName = useMemo(() => {
    const cleanResponsible = responsible.trim();

    if (cleanResponsible) {
      return `Tablet ${cleanResponsible}`;
    }

    return 'Tablet produção';
  }, [responsible]);

  const statusUi = useMemo(() => {
    const map: Record<
      ProductionStatus,
      {
        page: string;
        panel: string;
        text: string;
        title: string;
        icon: typeof ShieldCheck;
      }
    > = {
      idle: {
        page: 'bg-slate-950',
        panel: 'bg-white/10 border-white/10',
        text: 'text-white',
        title: 'Aguardando leitura',
        icon: ScanLine,
      },
      processing: {
        page: 'bg-slate-950',
        panel: 'bg-white/10 border-white/10',
        text: 'text-white',
        title: 'Processando',
        icon: Loader2,
      },
      success: {
        page: 'bg-emerald-700',
        panel: 'bg-white/10 border-white/10',
        text: 'text-white',
        title: 'Liberado',
        icon: CheckCircle2,
      },
      expired: {
        page: 'bg-amber-600',
        panel: 'bg-white/10 border-white/10',
        text: 'text-white',
        title: 'Vencido',
        icon: AlertTriangle,
      },
      consumed: {
        page: 'bg-blue-700',
        panel: 'bg-white/10 border-white/10',
        text: 'text-white',
        title: 'Já consumido',
        icon: Clock3,
      },
      discarded: {
        page: 'bg-zinc-700',
        panel: 'bg-white/10 border-white/10',
        text: 'text-white',
        title: 'Descartado',
        icon: XCircle,
      },
      not_found: {
        page: 'bg-red-700',
        panel: 'bg-white/10 border-white/10',
        text: 'text-white',
        title: 'Não encontrada',
        icon: XCircle,
      },
      device_error: {
        page: 'bg-red-800',
        panel: 'bg-white/10 border-white/10',
        text: 'text-white',
        title: 'Dispositivo bloqueado',
        icon: Lock,
      },
      error: {
        page: 'bg-red-700',
        panel: 'bg-white/10 border-white/10',
        text: 'text-white',
        title: 'Falha na leitura',
        icon: XCircle,
      },
    };

    return map[status];
  }, [status]);

  const StatusIcon = statusUi.icon;

  useEffect(() => {
    focusInput();

    return () => {
      if (resetTimeoutRef.current) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasDevice) {
      setIsSettingsOpen(true);
      setStatus('device_error');
      setMessage('Configure o dispositivo para iniciar a operação');
    }
  }, [hasDevice]);

  useEffect(() => {
    const cleanDeviceId = normalizeDeviceId(deviceId);

    if (!cleanDeviceId) return;

    let cancelled = false;

    async function sendHeartbeat() {
      try {
        await api.post(
          '/mobile/devices/heartbeat',
          {
            deviceId: cleanDeviceId,
            name: deviceName,
          },
          {
            headers: {
              'x-device-id': cleanDeviceId,
            },
            params: {
              deviceId: cleanDeviceId,
            },
          },
        );

        if (!cancelled) {
          setStatus((current) => (current === 'device_error' ? 'idle' : current));
          setMessage((current) =>
            current === 'Configure o dispositivo para iniciar a operação' ||
              current === 'Configure o dispositivo'
              ? 'Aguardando leitura'
              : current,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('device_error');
          setMessage(getErrorMessage(error, 'Falha ao registrar dispositivo'));
        }
      }
    }

    void sendHeartbeat();

    const interval = window.setInterval(() => {
      void sendHeartbeat();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [deviceId, deviceName]);

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 60);
  }

  function playFeedback(type: 'success' | 'error') {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = type === 'success' ? 880 : 220;
      gain.gain.value = 0.08;

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.16);
    } catch {
      // feedback sonoro opcional
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(type === 'success' ? 80 : [120, 80, 120]);
    }
  }

  function addLog(nextStatus: ProductionStatus, title: string, description: string) {
    setScanLogs((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time: new Intl.DateTimeFormat('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date()),
        status: nextStatus,
        title,
        description,
      },
      ...current,
    ].slice(0, 8));
  }

  function clearResetTimer() {
    if (resetTimeoutRef.current) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  }

  function resetReader() {
    clearResetTimer();
    processingRef.current = false;
    setCode('');
    setStatus(hasDevice ? 'idle' : 'device_error');
    setMessage(hasDevice ? 'Aguardando leitura' : 'Configure o dispositivo');
    setLastLookup(null);
    setLastConsume(null);
    focusInput();
  }

  function scheduleReset() {
    clearResetTimer();
    resetTimeoutRef.current = window.setTimeout(resetReader, AUTO_RESET_MS);
  }

  async function handleScan(rawCode: string) {
    const cleanCode = rawCode.trim();
    const cleanDeviceId = normalizeDeviceId(deviceId);

    if (!cleanCode || processingRef.current) return;

    if (!cleanDeviceId) {
      setStatus('device_error');
      setMessage('Dispositivo não configurado');
      setIsSettingsOpen(true);
      setCode('');
      playFeedback('error');
      return;
    }

    try {
      clearResetTimer();
      processingRef.current = true;
      setStatus('processing');
      setMessage('Validando etiqueta');
      setLastLookup(null);
      setLastConsume(null);

      const { data: lookup } = await api.get<MobileLookupResponse>(
        `/mobile/labels/lookup/${encodeURIComponent(cleanCode)}`,
        {
          params: {
            deviceId: cleanDeviceId,
          },
        },
      );

      setLastLookup(lookup);

      const lookupStatus = getStatusFromLookup(lookup);

      if (lookupStatus !== 'success' || !lookup.id) {
        setStatus(lookupStatus);
        setMessage(lookup.message || 'Etiqueta bloqueada para consumo');
        addLog(
          lookupStatus,
          lookup.labelItem?.name || cleanCode,
          lookup.message || 'Etiqueta bloqueada',
        );
        playFeedback('error');
        return;
      }

      setMessage('Consumindo etiqueta');

      const { data: consumed } = await api.patch<ConsumeResponse>(
        `/mobile/labels/${lookup.id}/consume`,
        {
          responsible: responsible.trim() || undefined,
        },
        {
          params: {
            deviceId: cleanDeviceId,
          },
        },
      );

      setLastConsume(consumed);
      setStatus('success');
      setMessage(consumed.message || 'Etiqueta consumida com sucesso');
      addLog(
        'success',
        lookup.labelItem?.name || consumed.itemName || cleanCode,
        consumed.message || 'Etiqueta consumida',
      );
      playFeedback('success');
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Falha na leitura da etiqueta');
      const lowerMessage = errorMessage.toLowerCase();
      const nextStatus =
        lowerMessage.includes('dispositivo') || lowerMessage.includes('device')
          ? 'device_error'
          : 'error';

      setStatus(nextStatus);
      setMessage(errorMessage);
      addLog(nextStatus, cleanCode, errorMessage);
      playFeedback('error');
    } finally {
      scheduleReset();
    }
  }

  function handleInputChange(value: string) {
    setCode(value);

    const cleanValue = value.trim();

    if (cleanValue.length >= 24) {
      void handleScan(cleanValue);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    void handleScan(code);
  }

  function saveSettings() {
    const cleanDeviceId = normalizeDeviceId(draftDeviceId);
    const cleanResponsible = draftResponsible.trim();

    if (cleanDeviceId) {
      localStorage.setItem(DEVICE_ID_KEY, cleanDeviceId);
    } else {
      localStorage.removeItem(DEVICE_ID_KEY);
    }

    if (cleanResponsible) {
      localStorage.setItem(RESPONSIBLE_KEY, cleanResponsible);
    } else {
      localStorage.removeItem(RESPONSIBLE_KEY);
    }

    setDeviceId(cleanDeviceId);
    setResponsible(cleanResponsible);
    setIsSettingsOpen(false);
    setStatus(cleanDeviceId ? 'idle' : 'device_error');
    setMessage(cleanDeviceId ? 'Aguardando leitura' : 'Configure o dispositivo');
    focusInput();
  }

  const productName =
    lastLookup?.labelItem?.name || lastConsume?.itemName || 'Nenhuma etiqueta lida';

  return (
    <div
      className={`min-h-screen ${statusUi.page} ${statusUi.text} transition-colors duration-300`}
      onClick={focusInput}
    >
      <div className="flex min-h-screen flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <TabletSmartphone size={24} />
            </div>

            <div>
              <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                EvTag Produção
              </h1>
              <p className="text-sm font-semibold text-white/60">
                {hasDevice ? `Dispositivo: ${deviceId}` : 'Dispositivo não configurado'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setDraftDeviceId(deviceId);
              setDraftResponsible(responsible);
              setIsSettingsOpen(true);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black ring-1 ring-white/10 transition hover:bg-white/15"
          >
            <Settings size={18} />
            Configurar
          </button>
        </header>

        <main className="grid flex-1 items-center gap-6 py-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="space-y-6 text-center">
            <div className={`rounded-[2rem] border p-6 shadow-2xl backdrop-blur ${statusUi.panel}`}>
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/15 ring-1 ring-white/10">
                <StatusIcon
                  size={52}
                  className={status === 'processing' ? 'animate-spin' : ''}
                />
              </div>

              <div className="mt-6 font-display text-6xl font-black uppercase tracking-tight sm:text-7xl lg:text-8xl">
                {statusUi.title}
              </div>

              <p className="mx-auto mt-4 max-w-3xl text-lg font-semibold text-white/75 sm:text-2xl">
                {message}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
              <div className="mb-3 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide text-white/60">
                <Keyboard size={16} />
                Leitura contínua
              </div>

              <input
                ref={inputRef}
                value={code}
                disabled={!hasDevice || status === 'processing'}
                onChange={(event) => handleInputChange(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Escaneie o QR Code"
                autoFocus
                autoComplete="off"
                inputMode="text"
                className="w-full rounded-2xl border-0 bg-white px-5 py-6 text-center text-2xl font-black text-slate-950 outline-none ring-4 ring-transparent transition placeholder:text-slate-400 focus:ring-white/25 disabled:cursor-not-allowed disabled:opacity-70 sm:text-3xl"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCard label="Produto" value={productName} />
              <InfoCard label="Lote" value={lastLookup?.lot || '-'} />
              <InfoCard label="Validade" value={formatDateTime(lastLookup?.expiresAt)} />
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-black">
                    Dados da etiqueta
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-white/60">
                    Última leitura processada
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    resetReader();
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-2xl bg-white/10 px-3 text-sm font-black ring-1 ring-white/10 transition hover:bg-white/15"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <DetailRow label="Categoria" value={lastLookup?.labelItem?.category?.name || '-'} />
                <DetailRow label="Quantidade" value={lastLookup?.quantity ? String(lastLookup.quantity) : '-'} />
                <DetailRow
                  label="Peso"
                  value={
                    lastLookup?.weight
                      ? `${lastLookup.weight} ${lastLookup.weightUnit || ''}`.trim()
                      : '-'
                  }
                />
                <DetailRow label="Fornecedor" value={lastLookup?.brandOrSupplier || '-'} />
                <DetailRow label="Responsável" value={responsible || lastLookup?.responsible || '-'} />
                <DetailRow label="Empresa" value={lastLookup?.company?.name || '-'} />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
              <h2 className="font-display text-xl font-black">Últimas leituras</h2>

              <div className="mt-4 space-y-3">
                {scanLogs.length === 0 ? (
                  <p className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white/60">
                    Nenhuma leitura registrada.
                  </p>
                ) : (
                  scanLogs.map((log) => <ScanLogRow key={log.id} log={log} />)
                )}
              </div>
            </div>
          </aside>
        </main>
      </div>

      {isSettingsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-black text-slate-950">
                  Configuração do tablet
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Informe o dispositivo cadastrado no painel.
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Settings size={22} />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Device ID
                </span>
                <input
                  value={draftDeviceId}
                  onChange={(event) => setDraftDeviceId(event.target.value)}
                  placeholder="Ex.: cozinha-tablet-01"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-evtag-primary"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Responsável padrão
                </span>
                <input
                  value={draftResponsible}
                  onChange={(event) => setDraftResponsible(event.target.value)}
                  placeholder="Ex.: Cozinha"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold outline-none transition focus:border-evtag-primary"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  focusInput();
                }}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={saveSettings}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-evtag-primary px-5 text-sm font-black text-white transition hover:bg-evtag-dark"
              >
                Salvar configuração
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-left backdrop-blur">
      <p className="text-xs font-black uppercase tracking-wide text-white/50">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/10 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-white/50">
        {label}
      </p>
      <p className="truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function ScanLogRow({ log }: { log: ScanLog }) {
  const color = {
    idle: 'bg-slate-400',
    processing: 'bg-slate-400',
    success: 'bg-emerald-400',
    expired: 'bg-amber-400',
    consumed: 'bg-blue-400',
    discarded: 'bg-zinc-400',
    not_found: 'bg-red-400',
    device_error: 'bg-red-400',
    error: 'bg-red-400',
  }[log.status];

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{log.title}</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-white/55">
            {log.description}
          </p>
        </div>
      </div>

      <p className="shrink-0 text-xs font-black text-white/50">{log.time}</p>
    </div>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
