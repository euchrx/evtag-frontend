import { useEffect, useState } from 'react';
import { MonitorSmartphone, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type Device = {
  id: string;
  deviceId: string;
  name?: string | null;
  isActive: boolean;
  lastSeenAt?: string | null;
  isOnline: boolean;
};

function formatDateOnly(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toISOString().slice(0, 10);
}

export function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { showToast } = useToast();

  async function fetchDevices() {
    try {
      setIsLoading(true);

      const { data } = await api.get<Device[]>('/devices/status');
      setDevices(data);
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao carregar dispositivos'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchDevices();

    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  async function toggleDevice(device: Device) {
    try {
      setUpdatingId(device.id);

      if (device.isActive) {
        await api.patch(`/devices/${device.id}/deactivate`);
      } else {
        await api.patch(`/devices/${device.id}/activate`);
      }

      await fetchDevices();

      showToast(
        device.isActive
          ? 'Dispositivo desativado'
          : 'Dispositivo ativado',
        'success',
      );
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao alterar dispositivo'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function renameDevice(device: Device) {
    const name = window.prompt('Nome do dispositivo', device.name || '');

    if (!name?.trim()) return;

    try {
      setUpdatingId(device.id);

      await api.patch(`/devices/${device.id}/rename`, {
        name: name.trim(),
      });

      await fetchDevices();

      showToast('Dispositivo renomeado', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao renomear'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-4xl font-black text-evtag-text">
            Dispositivos
          </h1>

          <p className="mt-2 text-sm text-evtag-muted">
            Tablets, leitores e dispositivos conectados à operação.
          </p>
        </div>

        <button
          onClick={() => void fetchDevices()}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-evtag-primary px-5 text-sm font-bold text-white shadow-lg hover:bg-evtag-dark"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      {/* LISTA */}
      <section className="rounded-[2rem] border border-evtag-border bg-white shadow-sm">

        <div className="border-b border-evtag-border px-6 py-5">
          <h2 className="font-display text-xl font-extrabold text-evtag-text">
            Dispositivos cadastrados
          </h2>

          <p className="text-sm text-evtag-muted">
            {devices.length} dispositivo(s)
          </p>
        </div>

        {isLoading ? (
          <Empty message="Carregando dispositivos..." />
        ) : devices.length === 0 ? (
          <Empty message="Nenhum dispositivo encontrado." />
        ) : (
          <div className="divide-y">
            {devices.map((d) => {
              const isBusy = updatingId === d.id;

              return (
                <div
                  key={d.id}
                  className="flex flex-col gap-4 px-6 py-5 transition hover:bg-evtag-light/40 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-evtag-light text-evtag-primary">
                      <MonitorSmartphone size={22} />
                    </div>

                    <div>
                      <p className="font-bold text-evtag-text">
                        {d.name || 'Sem nome'}
                      </p>

                      <p className="text-xs text-evtag-muted">
                        {d.deviceId}
                      </p>

                      <div className="mt-1 flex gap-2">
                        <Badge
                          color={d.isOnline ? 'green' : 'red'}
                          label={d.isOnline ? 'Online' : 'Offline'}
                        />

                        <Badge
                          color={d.isActive ? 'blue' : 'gray'}
                          label={d.isActive ? 'Ativo' : 'Inativo'}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-evtag-muted">
                      Último acesso: {formatDateOnly(d.lastSeenAt)}
                    </span>

                    <button
                      onClick={() => renameDevice(d)}
                      disabled={isBusy}
                      className="rounded-xl bg-evtag-light px-3 py-2 text-xs font-bold text-evtag-text hover:bg-evtag-light/80"
                    >
                      Renomear
                    </button>

                    <button
                      onClick={() => toggleDevice(d)}
                      disabled={isBusy}
                      className={`rounded-xl px-3 py-2 text-xs font-bold text-white ${
                        d.isActive
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {isBusy
                        ? 'Salvando...'
                        : d.isActive
                        ? 'Desativar'
                        : 'Ativar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Badge({
  label,
  color,
}: {
  label: string;
  color: 'green' | 'red' | 'blue' | 'gray';
}) {
  const map = {
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-slate-100 text-slate-700',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold ${map[color]}`}>
      {label}
    </span>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-evtag-muted">
      {message}
    </div>
  );
}