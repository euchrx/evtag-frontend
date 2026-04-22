import { useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/getErrorMessage.ts';

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
      const response = await api.get<Category[]>('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error(error);
      showToast(
        getErrorMessage(error, 'Não foi possível carregar as categorias.'),
        'error'
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
    setForm({
      name: category.name,
    });
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
    };

    if (!payload.name) {
      showToast('Informe o nome da categoria.', 'warning');
      return;
    }

    const isEditing = !!editingId;

    try {
      setIsSaving(true);

      if (editingId) {
        await api.patch(`/categories/${editingId}`, payload);
      } else {
        await api.post('/categories', payload);
      }

      resetForm();
      await loadCategories();

      showToast(
        isEditing
          ? 'Categoria atualizada com sucesso.'
          : 'Categoria criada com sucesso.',
        'success'
      );
    } catch (error) {
      console.error(error);
      showToast(
        getErrorMessage(error, 'Não foi possível salvar a categoria.'),
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    if (editingId && editingId !== category.id) {
      showToast(
        'Finalize ou cancele a edição antes de excluir outra categoria.',
        'warning'
      );
      return;
    }

    if (!confirm(`Excluir "${category.name}"?`)) return;

    try {
      setDeletingId(category.id);
      await api.delete(`/categories/${category.id}`);

      if (editingId === category.id) {
        resetForm();
      }

      await loadCategories();

      showToast('Categoria excluída com sucesso.', 'success');
    } catch (error) {
      console.error(error);
      showToast(
        getErrorMessage(error, 'Não foi possível excluir a categoria.'),
        'error'
      );
    } finally {
      setDeletingId(null);
    }
  }

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalizedSearch)
    );
  }, [categories, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Categorias</h1>
        <p className="text-sm text-slate-600">
          Cadastre e gerencie as categorias utilizadas pelos itens.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId ? 'Editar categoria' : 'Nova categoria'}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
              >
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Nome</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value })}
                placeholder="Ex.: Hortifruti"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
                maxLength={80}
                required
              />
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? editingId
                  ? 'Salvando alterações...'
                  : 'Salvando...'
                : editingId
                ? 'Salvar alterações'
                : 'Salvar categoria'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Categorias cadastradas
              </h2>
              <p className="text-sm text-slate-600">
                {filteredCategories.length} categoria(s) encontrada(s)
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar categoria"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900 sm:max-w-xs"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1fr)_180px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <div>Nome</div>
              <div>Ações</div>
            </div>

            {isLoading ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                Carregando categorias...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                Nenhuma categoria encontrada.
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="grid grid-cols-[minmax(0,1fr)_180px] gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                >
                  <div className="truncate font-medium text-slate-900">
                    {category.name}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(category)}
                      disabled={deletingId === category.id}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(category)}
                      disabled={deletingId === category.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === category.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}