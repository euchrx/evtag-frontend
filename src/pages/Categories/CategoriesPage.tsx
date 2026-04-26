import { useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import {
  FolderTree,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

type Category = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CategoryForm = {
  name: string;
};

const initialForm: CategoryForm = {
  name: '',
};

function formatDateOnly(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toISOString().slice(0, 10);
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    void loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setIsLoading(true);

      const { data } = await api.get<Category[]>('/categories');
      setCategories(data);
    } catch (error) {
      showToast(
        getErrorMessage(error, 'Erro ao carregar categorias'),
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function handleEdit(category: Category) {
    setEditingId(category.id);
    setForm({ name: category.name });
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      showToast('Informe o nome da categoria.', 'warning');
      return;
    }

    try {
      setIsSaving(true);

      if (editingId) {
        await api.patch(`/categories/${editingId}`, { name });
      } else {
        await api.post('/categories', { name });
      }

      resetForm();
      await loadCategories();

      showToast(
        editingId
          ? 'Categoria atualizada com sucesso.'
          : 'Categoria criada com sucesso.',
        'success',
      );
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao salvar categoria'), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    try {
      setDeletingId(category.id);

      await api.delete(`/categories/${category.id}`);

      if (editingId === category.id) {
        resetForm();
      }

      await loadCategories();

      showToast('Categoria excluída com sucesso.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao excluir categoria'), 'error');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return categories;

    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalizedSearch),
    );
  }, [categories, search]);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive).length,
    [categories],
  );

  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        isLoading={isLoading}
        onRefresh={loadCategories}
        total={categories.length}
        active={activeCategories}
      />

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                Cadastro
              </div>

              <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                {editingId ? 'Editar categoria' : 'Nova categoria'}
              </h2>

              <p className="mt-2 text-sm leading-6 text-evtag-muted">
                Organize os produtos por grupos operacionais para facilitar a
                impressão e controle das etiquetas.
              </p>
            </div>

            <div className="rounded-2xl bg-evtag-primary p-3 text-white">
              <FolderTree size={22} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-evtag-text">
                Nome da categoria
              </span>

              <input
                value={form.name}
                onChange={(event) => setForm({ name: event.target.value })}
                placeholder="Ex.: Hortifruti"
                maxLength={80}
                className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={17} />
                {isSaving
                  ? 'Salvando...'
                  : editingId
                    ? 'Salvar alterações'
                    : 'Criar categoria'}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-evtag-border bg-white px-5 text-sm font-bold text-evtag-text transition hover:bg-evtag-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X size={18} />
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="rounded-[2rem] border border-evtag-border bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-evtag-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-xl font-extrabold text-evtag-text">
                Categorias cadastradas
              </h2>

              <p className="mt-1 text-sm text-evtag-muted">
                {filteredCategories.length} resultado(s) no escopo atual.
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-evtag-muted"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar categoria"
                className="h-11 w-full rounded-2xl border border-evtag-border bg-white pl-11 pr-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:ring-4 focus:ring-evtag-light"
              />
            </div>
          </div>

          {isLoading ? (
            <EmptyMessage message="Carregando categorias..." />
          ) : filteredCategories.length === 0 ? (
            <EmptyMessage message="Nenhuma categoria encontrada." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-evtag-border text-sm">
                <thead className="bg-evtag-light/60">
                  <tr>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Atualizada em</TableHead>
                    <TableHead align="right">Ações</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-evtag-border bg-white">
                  {filteredCategories.map((category) => {
                    const isDeleting = deletingId === category.id;

                    return (
                      <tr
                        key={category.id}
                        className="transition hover:bg-evtag-light/60"
                      >
                        <td className="max-w-[320px] px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-evtag-light text-evtag-primary">
                              <FolderTree size={18} />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-evtag-text">
                                {category.name}
                              </p>
                              <p className="mt-0.5 text-xs text-evtag-muted">
                                Grupo operacional de produtos
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <StatusBadge isActive={category.isActive} />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-medium text-evtag-muted">
                          {formatDateOnly(category.createdAt)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-medium text-evtag-muted">
                          {formatDateOnly(category.updatedAt)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(category)}
                              disabled={isDeleting}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-bold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Pencil size={15} />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDelete(category)}
                              disabled={isDeleting}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-red-50 px-3 text-xs font-bold text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 size={15} />
                              {isDeleting ? 'Excluindo...' : 'Excluir'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex h-12 min-w-[96px] items-center gap-3 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-evtag-border">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-evtag-muted">
          {label}
        </p>
        <p className="font-display text-xl font-black leading-none text-evtag-primary">
          {value}
        </p>
      </div>
    </div>
  );
}

function PageHeader({
  isLoading,
  onRefresh,
  total,
  active,
}: {
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  total: number;
  active: number;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-evtag-text">
          Categorias
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-evtag-muted">
          Organize produtos e etiquetas por grupos operacionais da filial.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <HeaderStat label="Total" value={total} />
        <HeaderStat label="Ativas" value={active} />

        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={isLoading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>
    </header>
  );
}

function TableHead({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`whitespace-nowrap px-5 py-4 text-${align} text-xs font-black uppercase tracking-wide text-evtag-muted`}
    >
      {children}
    </th>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${isActive
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : 'bg-slate-100 text-slate-700 ring-slate-200'
        }`}
    >
      {isActive ? 'Ativa' : 'Inativa'}
    </span>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-evtag-muted">
      {message}
    </div>
  );
}