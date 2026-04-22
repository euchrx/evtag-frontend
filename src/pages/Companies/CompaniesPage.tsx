import { useEffect, useState } from 'react';
import { api } from '../../services/api';

type Company = {
  id: string;
  name: string;
  isActive: boolean;
};

export function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');

  async function load() {
    const { data } = await api.get<Company[]>('/companies');
    setCompanies(data);
  }

  async function handleCreate() {
    if (!name.trim()) return;

    await api.post('/companies', {
      name: name.trim(),
    });

    setName('');
    await load();
  }

  async function toggle(company: Company) {
    await api.patch(`/companies/${company.id}`, {
      isActive: !company.isActive,
    });

    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <h2 className="text-lg font-semibold text-slate-900">
        Empresas
      </h2>

      <div className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da empresa"
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
        />

        <button
          onClick={handleCreate}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Criar
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {companies.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-xl border px-4 py-3"
          >
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-slate-500">
                {c.isActive ? 'Ativa' : 'Inativa'}
              </div>
            </div>

            <button
              onClick={() => toggle(c)}
              className="rounded-lg border px-3 py-1 text-xs"
            >
              {c.isActive ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}