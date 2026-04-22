import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type StatusType =
  | 'idle'
  | 'valid'
  | 'expired'
  | 'consumed'
  | 'error';

export function KitchenPage() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<StatusType>('idle');
  const [itemName, setItemName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  async function handleScan(value: string) {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      const { data } = await api.get(`/labels/prints/qr/${value}`);

      setItemName(data.labelItem.name);

      if (data.status !== 'ACTIVE') {
        setStatus('consumed');
        playError();
        return;
      }

      if (new Date(data.expiresAt) < new Date()) {
        setStatus('expired');
        playError();
        return;
      }

      await api.patch(`/labels/prints/${data.id}/status`, {
        status: 'CONSUMED',
      });

      setStatus('valid');
      playSuccess();
    } catch (error) {
      setStatus('error');
      playError();
      showToast(getErrorMessage(error, 'Erro ao ler etiqueta'), 'error');
    } finally {
      setTimeout(() => {
        setStatus('idle');
        setCode('');
        setItemName('');
        setIsProcessing(false);
        inputRef.current?.focus();
      }, 1500);
    }
  }

  function playSuccess() {
    new Audio('/success.mp3').play().catch(() => {});
  }

  function playError() {
    new Audio('/error.mp3').play().catch(() => {});
  }

  function handleChange(value: string) {
    setCode(value);

    if (value.length > 10) {
      handleScan(value);
    }
  }

  const colorMap = {
    idle: 'bg-slate-900',
    valid: 'bg-emerald-600',
    expired: 'bg-yellow-500',
    consumed: 'bg-blue-600',
    error: 'bg-red-600',
  };

  const statusText: Record<StatusType, string> = {
    idle: 'Aguardando leitura...',
    valid: '✔ OK',
    expired: '⚠ VENCIDO',
    consumed: 'ℹ JÁ UTILIZADO',
    error: '✖ ERRO',
  };

  return (
    <div
      className={`flex h-screen flex-col items-center justify-center transition-colors duration-300 text-white ${colorMap[status]}`}
    >
      <div className="w-full max-w-2xl px-6 text-center space-y-8">

        {/* TÍTULO */}
        <div>
          <h1 className="text-5xl font-bold tracking-tight">
            Modo Cozinha
          </h1>
          <p className="text-lg text-white/70 mt-2">
            Escaneie a etiqueta para validar
          </p>
        </div>

        {/* INPUT */}
        <div>
          <input
            ref={inputRef}
            autoFocus
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Escaneie o QR Code"
            className="w-full rounded-2xl px-6 py-5 text-black text-2xl text-center outline-none shadow-lg"
          />
        </div>

        {/* ITEM */}
        {itemName && (
          <div className="text-3xl font-semibold break-words">
            {itemName}
          </div>
        )}

        {/* STATUS */}
        <div className="text-6xl font-bold tracking-wide">
          {statusText[status]}
        </div>

        {/* BARRA VISUAL */}
        <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
          {status !== 'idle' && (
            <div className="h-full w-full bg-white animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}