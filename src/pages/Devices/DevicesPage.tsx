import { useEffect, useState } from 'react';
import { api } from '../../services/api';

type Device = {
  id: string;
  deviceId: string;
  name?: string;
  isActive: boolean;
  lastSeenAt?: string;
  isOnline: boolean;
};

export function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchDevices() {
    try {
      const { data } = await api.get('/devices/status');
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDevices();

    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  async function toggleDevice(device: Device) {
    try {
      if (device.isActive) {
        await api.patch(`/devices/${device.id}/deactivate`);
      } else {
        await api.patch(`/devices/${device.id}/activate`);
      }

      fetchDevices();
    } catch (e) {
      alert('Erro ao alterar dispositivo');
    }
  }

  async function renameDevice(device: Device) {
    const name = prompt('Nome do dispositivo', device.name || '');
    if (!name) return;

    await api.patch(`/devices/${device.id}/rename`, { name });
    fetchDevices();
  }

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dispositivos</h1>

      <div className="grid gap-4">
        {devices.map((d) => (
          <div
            key={d.id}
            className="rounded-xl border p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-semibold text-lg">
                {d.name || 'Sem nome'}
              </div>

              <div className="text-sm text-gray-500">
                {d.deviceId}
              </div>

              <div className="text-sm mt-1">
                {d.isOnline ? (
                  <span className="text-green-600">🟢 Online</span>
                ) : (
                  <span className="text-red-500">🔴 Offline</span>
                )}
              </div>

              {d.lastSeenAt && (
                <div className="text-xs text-gray-400">
                  Último acesso: {new Date(d.lastSeenAt).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => renameDevice(d)}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                Renomear
              </button>

              <button
                onClick={() => toggleDevice(d)}
                className={`px-3 py-1 rounded text-white ${
                  d.isActive ? 'bg-red-500' : 'bg-green-600'
                }`}
              >
                {d.isActive ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}