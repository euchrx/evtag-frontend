import { useEffect, useMemo, useState } from 'react';
import {
  CircleOff,
  Copy,
  Edit3,
  MonitorSmartphone,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  TabletSmartphone,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type Device = {
  id: string;
  deviceId: string;
  name?: string | null;
  isActive: boolean;
  lastSeenAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  isOnline: boolean;
};

type DeviceFilter = 'ALL' | 'ONLINE' | 'OFFLINE' | 'ACTIVE' | 'INACTIVE';

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function getLastSeenText(value?: string | null) {
  if (!value) return 'Sem registro';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Sem registro';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'Agora';
  if (diffMinutes === 1) return 'Há 1 minuto';
  if (diffMinutes < 60) return `Há ${diffMinutes} minutos`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours === 1) return 'Há 1 hora';
  if (diffHours < 24) return `Há ${diffHours} horas`;

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 1) return 'Há 1 dia';

  return `Há ${diffDays} dias`;
}

function getDeviceDisplayName(device: Device) {
  return device.name?.trim() || 'Dispositivo sem nome';
}

export function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<DeviceFilter>('ALL');
  const [renameTarget, setRenameTarget] = useState<Device | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const { showToast } = useToast();

  async function fetchDevices(options?: { silent?: boolean }) {
    try {
      if (!options?.silent) {
        setIsLoading(true);
      }

      const { data } = await api.get<Device[]>('/devices/status');

      setDevices(data);
      setLastUpdatedAt(new Date());
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao carregar dispositivos'), 'error');
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      if (!isMounted) return;
      await fetchDevices();
    }

    void loadInitial();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchDevices({ silent: true });
      }
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const summary = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((device) => device.isOnline).length;
    const offline = devices.filter((device) => !device.isOnline).length;
    const active = devices.filter((device) => device.isActive).length;
    const inactive = devices.filter((device) => !device.isActive).length;

    return {
      total,
      online,
      offline,
      active,
      inactive,
    };
  }, [devices]);

  const filteredDevices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'ONLINE' && device.isOnline) ||
        (filter === 'OFFLINE' && !device.isOnline) ||
        (filter === 'ACTIVE' && device.isActive) ||
        (filter === 'INACTIVE' && !device.isActive);

      const matchesSearch =
        !normalizedSearch ||
        getDeviceDisplayName(device).toLowerCase().includes(normalizedSearch) ||
        device.deviceId.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [devices, filter, searchTerm]);

  async function toggleDevice(device: Device) {
    try {
      setUpdatingId(device.id);

      if (device.isActive) {
        await api.patch(`/devices/${device.id}/deactivate`);
      } else {
        await api.patch(`/devices/${device.id}/activate`);
      }

      await fetchDevices({ silent: true });

      showToast(
        device.isActive ? 'Dispositivo desativado' : 'Dispositivo ativado',
        'success',
      );
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao alterar dispositivo'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  function openRenameModal(device: Device) {
    setRenameTarget(device);
    setRenameValue(device.name?.trim() || '');
  }

  function closeRenameModal() {
    setRenameTarget(null);
    setRenameValue('');
  }

  async function submitRename() {
    if (!renameTarget) return;

    const nextName = renameValue.trim();

    if (!nextName) {
      showToast('Informe um nome para o dispositivo', 'error');
      return;
    }

    try {
      setUpdatingId(renameTarget.id);

      await api.patch(`/devices/${renameTarget.id}/rename`, {
        name: nextName,
      });

      await fetchDevices({ silent: true });
      closeRenameModal();
      showToast('Dispositivo renomeado', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao renomear dispositivo'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function copyDeviceId(deviceId: string) {
    try {
      await navigator.clipboard.writeText(deviceId);
      showToast('ID do dispositivo copiado', 'success');
    } catch {
      showToast('Não foi possível copiar o ID', 'error');
    }
  }

  return (
    <div className="space-y-8 font-sans">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
            Operação
          </div>

          <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-evtag-text">
            Dispositivos
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-evtag-muted">
            Controle de tablets, leitores e estações conectadas à produção.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchDevices()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total"
          value={summary.total}
          description="Dispositivos cadastrados"
          icon={TabletSmartphone}
          variant="primary"
        />

        <SummaryCard
          title="Online"
          value={summary.online}
          description="Acessaram recentemente"
          icon={Wifi}
          variant="success"
        />

        <SummaryCard
          title="Offline"
          value={summary.offline}
          description="Sem atividade recente"
          icon={WifiOff}
          variant={summary.offline > 0 ? 'warning' : 'neutral'}
        />

        <SummaryCard
          title="Ativos"
          value={summary.active}
          description="Liberados para uso"
          icon={ShieldCheck}
          variant="info"
        />

        <SummaryCard
          title="Inativos"
          value={summary.inactive}
          description="Bloqueados na operação"
          icon={CircleOff}
          variant={summary.inactive > 0 ? 'danger' : 'neutral'}
        />
      </section>

      <section className="rounded-[2rem] border border-evtag-border bg-white shadow-sm">
        <div className="border-b border-evtag-border px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="font-display text-xl font-extrabold text-evtag-text">
                Dispositivos cadastrados
              </h2>

              <p className="mt-1 text-sm text-evtag-muted">
                {filteredDevices.length} de {devices.length} dispositivo(s)
                {lastUpdatedAt ? ` · Atualizado ${formatDateTime(lastUpdatedAt.toISOString())}` : ''}
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-[260px]">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-evtag-muted"
                />

                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome ou ID"
                  className="h-11 w-full rounded-2xl border border-evtag-border bg-white pl-11 pr-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted focus:border-evtag-primary"
                />
              </div>

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as DeviceFilter)}
                className="h-11 rounded-2xl border border-evtag-border bg-white px-4 text-sm font-bold text-evtag-text outline-none transition focus:border-evtag-primary"
              >
                <option value="ALL">Todos</option>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Empty message="Carregando dispositivos..." />
        ) : filteredDevices.length === 0 ? (
          <Empty message="Nenhum dispositivo encontrado." />
        ) : (
          <div className="divide-y divide-evtag-border">
            {filteredDevices.map((device) => {
              const isBusy = updatingId === device.id;

              return (
                <div
                  key={device.id}
                  className="grid gap-5 px-6 py-5 transition hover:bg-evtag-light/40 xl:grid-cols-[1.2fr_0.8fr_0.7fr_auto] xl:items-center"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-evtag-light text-evtag-primary">
                      <MonitorSmartphone size={22} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-bold text-evtag-text">
                          {getDeviceDisplayName(device)}
                        </p>

                        <StatusBadge
                          color={device.isOnline ? 'green' : 'red'}
                          label={device.isOnline ? 'Online' : 'Offline'}
                        />

                        <StatusBadge
                          color={device.isActive ? 'blue' : 'gray'}
                          label={device.isActive ? 'Ativo' : 'Inativo'}
                        />
                      </div>

                      <div className="mt-2 flex max-w-full items-center gap-2">
                        <code className="truncate rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {device.deviceId}
                        </code>

                        <button
                          type="button"
                          onClick={() => void copyDeviceId(device.deviceId)}
                          className="rounded-lg p-1.5 text-evtag-muted transition hover:bg-evtag-light hover:text-evtag-primary"
                          title="Copiar ID"
                        >
                          <Copy size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <InfoColumn
                    label="Último acesso"
                    value={getLastSeenText(device.lastSeenAt)}
                    detail={formatDateTime(device.lastSeenAt)}
                  />

                  <InfoColumn
                    label="Cadastro"
                    value={formatDateTime(device.createdAt)}
                    detail={device.updatedAt ? `Atualizado ${formatDateTime(device.updatedAt)}` : '-'}
                  />

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <button
                      type="button"
                      onClick={() => openRenameModal(device)}
                      disabled={isBusy}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-evtag-light px-4 text-xs font-black text-evtag-text transition hover:bg-evtag-light/80 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Edit3 size={15} />
                      Renomear
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleDevice(device)}
                      disabled={isBusy}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        device.isActive
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      <Power size={15} />
                      {isBusy
                        ? 'Salvando...'
                        : device.isActive
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

      {renameTarget ? (
        <RenameModal
          value={renameValue}
          loading={updatingId === renameTarget.id}
          deviceId={renameTarget.deviceId}
          onChange={setRenameValue}
          onCancel={closeRenameModal}
          onConfirm={() => void submitRename()}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  variant,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  variant: 'primary' | 'success' | 'info' | 'neutral' | 'warning' | 'danger';
}) {
  const variants: Record<string, string> = {
    primary: 'bg-evtag-light text-evtag-primary',
    success: 'bg-emerald-50 text-emerald-700',
    info: 'bg-blue-50 text-blue-700',
    neutral: 'bg-slate-100 text-slate-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
  };

  return (
    <div className="rounded-[1.75rem] border border-evtag-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${variants[variant]}`}
      >
        <Icon size={22} />
      </div>

      <p className="text-sm font-bold text-evtag-muted">{title}</p>

      <p className="mt-2 font-display text-4xl font-black text-evtag-text">
        {value.toLocaleString('pt-BR')}
      </p>

      <p className="mt-2 text-sm text-evtag-muted">{description}</p>
    </div>
  );
}

function StatusBadge({
  label,
  color,
}: {
  label: string;
  color: 'green' | 'red' | 'blue' | 'gray';
}) {
  const map = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${map[color]}`}>
      {label}
    </span>
  );
}

function InfoColumn({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-[#9A8AA8]">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-evtag-text">{value}</p>

      {detail ? <p className="mt-0.5 text-xs text-evtag-muted">{detail}</p> : null}
    </div>
  );
}

function RenameModal({
  value,
  loading,
  deviceId,
  onChange,
  onCancel,
  onConfirm,
}: {
  value: string;
  loading: boolean;
  deviceId: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] border border-evtag-border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-black text-evtag-text">
              Renomear dispositivo
            </h2>

            <p className="mt-1 text-sm text-evtag-muted">
              Identifique o tablet ou estação para a equipe operacional.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl p-2 text-evtag-muted transition hover:bg-evtag-light hover:text-evtag-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-evtag-bg px-4 py-3">
          <p className="text-xs font-black uppercase tracking-wide text-evtag-muted">
            ID do dispositivo
          </p>
          <p className="mt-1 break-all text-xs font-bold text-evtag-text">
            {deviceId}
          </p>
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-black uppercase tracking-wide text-evtag-muted">
            Nome do dispositivo
          </span>

          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoFocus
            placeholder="Ex: Tablet Cozinha 01"
            className="mt-2 h-12 w-full rounded-2xl border border-evtag-border bg-white px-4 text-sm font-semibold text-evtag-text outline-none transition placeholder:text-evtag-muted focus:border-evtag-primary"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onConfirm();
              }
            }}
          />
        </label>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-evtag-border bg-white px-5 text-sm font-black text-evtag-text transition hover:bg-evtag-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-evtag-primary px-5 text-sm font-black text-white transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar nome'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-evtag-muted">
      {message}
    </div>
  );
}
