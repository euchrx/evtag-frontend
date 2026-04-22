import { useCallback, useMemo, useRef, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type LabelPrintStatus = 'ACTIVE' | 'EXPIRED' | 'DISCARDED' | 'CONSUMED';

export function ScanPage() {
  const [qrCode, setQrCode] = useState('');
  const [print, setPrint] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanLocked, setIsScanLocked] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);

  const unlockTimeoutRef = useRef<number | null>(null);

  const { showToast } = useToast();

  const canSearch = useMemo(() => qrCode.trim().length > 0, [qrCode]);

  function playBeep(type: 'success' | 'error' = 'success') {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = type === 'success' ? 900 : 200;

      gain.gain.value = 0.1;

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

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

      const res = await api.get(`/labels/prints/qr/${encodeURIComponent(code)}`);

      setPrint(res.data);
      setQrCode(code);

      setScanResult('success');
      playBeep('success');
    } catch (error) {
      setPrint(null);
      setScanResult('error');
      playBeep('error');

      showToast('Etiqueta não encontrada', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(status: LabelPrintStatus) {
    if (!print) return;

    try {
      setIsUpdating(true);

      await api.patch(`/labels/prints/${print.id}/status`, { status });

      const res = await api.get(
        `/labels/prints/qr/${encodeURIComponent(print.qrCode)}`
      );

      setPrint(res.data);
      showToast('Status atualizado', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao atualizar'), 'error');
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

  function format(date: string) {
    return new Date(date).toLocaleString('pt-BR');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Conferência</h1>

      {/* STATUS VISUAL GRANDE */}
      {scanResult && (
        <div
          className={`text-center text-lg font-bold p-4 rounded-xl ${
            scanResult === 'success'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {scanResult === 'success' ? 'ETIQUETA OK' : 'ETIQUETA NÃO ENCONTRADA'}
        </div>
      )}

      <div className="grid gap-4">
        <input
          value={qrCode}
          onChange={(e) => setQrCode(e.target.value)}
          placeholder="QR Code"
          className="border p-2 rounded"
        />

        <button
          onClick={() => handleSearch()}
          disabled={!canSearch || isLoading}
          className="bg-slate-900 text-white p-2 rounded"
        >
          {isLoading ? 'Buscando...' : 'Buscar'}
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => setIsScannerOpen((p) => !p)}
            className="bg-slate-200 px-3 py-2 rounded"
          >
            {isScannerOpen ? 'Fechar câmera' : 'Abrir câmera'}
          </button>

          <button
            onClick={resetScan}
            className="bg-emerald-600 text-white px-3 py-2 rounded"
          >
            Nova leitura
          </button>
        </div>
      </div>

      {isScannerOpen && (
        <div className="rounded-xl overflow-hidden">
          <Scanner
            formats={['qr_code']}
            constraints={{ facingMode: 'environment' }}
            onScan={(codes) => {
              const value = codes?.[0]?.rawValue;
              void handleDetectedCode(value);
            }}
          />
        </div>
      )}

      {print && (
        <div className="border rounded-xl p-4 space-y-3">
          <div className="text-xl font-bold">{print.labelItem.name}</div>
          <div className="text-sm text-slate-500">
            {print.labelItem.category.name}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Preparo: {format(print.preparedAt)}</div>
            <div>Validade: {format(print.expiresAt)}</div>
            <div>Lote: {print.lot ?? '-'}</div>
            <div>Status: {print.status}</div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => updateStatus('CONSUMED')}
              disabled={isUpdating}
              className="bg-blue-600 text-white px-3 py-2 rounded"
            >
              Consumido
            </button>

            <button
              onClick={() => updateStatus('DISCARDED')}
              disabled={isUpdating}
              className="bg-red-600 text-white px-3 py-2 rounded"
            >
              Descartado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}