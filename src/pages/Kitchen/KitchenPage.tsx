import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type StatusType = 'idle' | 'valid' | 'expired' | 'consumed' | 'error';

type MobileLabelResponse = {
  id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'DISCARDED' | 'CONSUMED';
  canConsume: boolean;
  isExpired: boolean;
  labelItem: {
    name: string;
  };
};

export function KitchenPage() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<StatusType>('idle');
  const [itemName, setItemName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const resetTimeoutRef = useRef<number | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    inputRef.current?.focus();

    return () => {
      if (resetTimeoutRef.current) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function resetState() {
    setStatus('idle');
    setCode('');
    setItemName('');
    setIsProcessing(false);
    focusInput();
  }

  function scheduleReset() {
    if (resetTimeoutRef.current) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = window.setTimeout(resetState, 1500);
  }

  async function handleScan(rawValue: string) {
    const value = rawValue.trim();

    if (!value || isProcessing) return;

    try {
      setIsProcessing(true);

      const { data } = await api.get<MobileLabelResponse>(
        `/labels/prints/qr/${encodeURIComponent(value)}/mobile`,
      );

      setItemName(data.labelItem.name);

      if (!data.canConsume) {
        if (data.isExpired) setStatus('expired');
        else if (data.status === 'CONSUMED') setStatus('consumed');
        else setStatus('error');

        playSound('error');
        return;
      }

      await api.patch(`/labels/prints/${data.id}/consume`);

      setStatus('valid');
      playSound('success');
    } catch (error) {
      setStatus('error');
      playSound('error');
      showToast(getErrorMessage(error, 'Erro ao ler etiqueta'), 'error');
    } finally {
      scheduleReset();
    }
  }

  function playSound(type: 'success' | 'error') {
    const audioPath = type === 'success' ? '/success.mp3' : '/error.mp3';
    new Audio(audioPath).play().catch(() => undefined);
  }

  function handleChange(value: string) {
    setCode(value);

    if (value.trim().length > 10) {
      void handleScan(value);
    }
  }

  const colorMap: Record<StatusType, string> = {
    idle: 'bg-evtag-primary',
    valid: 'bg-emerald-600',
    expired: 'bg-amber-500',
    consumed: 'bg-blue-600',
    error: 'bg-red-600',
  };

  const statusText: Record<StatusType, string> = {
    idle: 'Aguardando leitura...',
    valid: 'OK',
    expired: 'VENCIDO',
    consumed: 'JÁ UTILIZADO',
    error: 'ERRO',
  };

  const helperText: Record<StatusType, string> = {
    idle: 'Escaneie a etiqueta para validar automaticamente.',
    valid: 'Etiqueta validada e consumida com sucesso.',
    expired: 'Etiqueta vencida. Não utilizar o item.',
    consumed: 'Etiqueta já utilizada anteriormente.',
    error: 'Falha na leitura da etiqueta.',
  };

  return (
    <div
      className={`flex min-h-screen items-center justify-center px-6 text-white transition-colors duration-300 ${colorMap[status]}`}
      onClick={focusInput}
    >
      <div className="w-full max-w-4xl space-y-10 text-center">

        {/* HEADER */}
        <header>
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck size={28} />
            </div>
          </div>

          <h1 className="font-display text-5xl font-black tracking-tight">
            Modo Cozinha
          </h1>

          <p className="mt-3 text-lg text-white/80">
            {helperText[status]}
          </p>
        </header>

        {/* INPUT */}
        <div className="rounded-[2rem] bg-white/10 backdrop-blur p-6 shadow-2xl border border-white/10">
          <input
            ref={inputRef}
            autoFocus
            value={code}
            disabled={isProcessing}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Escaneie o QR Code"
            className="w-full rounded-2xl px-6 py-6 text-center text-3xl font-bold text-black outline-none"
          />
        </div>

        {/* ITEM */}
        {itemName && (
          <div className="rounded-[2rem] bg-white/10 backdrop-blur px-6 py-6 border border-white/10 shadow-xl">
            <p className="text-sm uppercase text-white/60 font-bold">
              Produto
            </p>

            <p className="mt-2 text-3xl font-bold break-words">
              {itemName}
            </p>
          </div>
        )}

        {/* STATUS */}
        <div className="space-y-4">
          <div className="text-7xl font-black tracking-wide">
            {statusText[status]}
          </div>

          <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
            {status !== 'idle' && (
              <div className="h-full w-full bg-white animate-pulse" />
            )}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="text-sm text-white/60">
          Sistema preparado para leitura contínua
        </footer>
      </div>
    </div>
  );
}