import { useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { api } from '../../services/api';

type LabelItemType = 'INPUT' | 'PRODUCTION' | 'FRACTIONED';

type Category = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type LabelItem = {
  id: string;
  name: string;
  categoryId: string;
  category: Category;
  itemType: LabelItemType;
  defaultShelfLifeHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type LabelItemForm = {
  name: string;
  categoryId: string;
  itemType: LabelItemType;
  defaultShelfLifeHours: number;
};

const itemTypeOptions: Array<{ value: LabelItemType; label: string }> = [
  { value: 'INPUT', label: 'Insumo' },
  { value: 'PRODUCTION', label: 'Produção' },
  { value: 'FRACTIONED', label: 'Fracionado' },
];

const initialForm: LabelItemForm = {
  name: '',
  categoryId: '',
  itemType: 'INPUT',
  defaultShelfLifeHours: 24,
};

export function ItemsPage() {
  const [items, setItems] = useState<LabelItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<LabelItemForm>(initialForm);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([loadItems(), loadCategories()]);
  }, []);

  async function loadItems() {
    try {
      setIsLoading(true);
      const response = await api.get<LabelItem[]>('/labels/items');
      setItems(response.data);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      alert('Não foi possível carregar os itens.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await api.get<Category[]>('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      alert('Não foi possível carregar as categorias.');
    }
  }

  function updateForm<K extends keyof LabelItemForm>(
    field: K,
    value: LabelItemForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function handleEdit(item: LabelItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      categoryId: item.categoryId,
      itemType: item.itemType,
      defaultShelfLifeHours: item.defaultShelfLifeHours,
    });
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      itemType: form.itemType,
      defaultShelfLifeHours: Number(form.defaultShelfLifeHours),
    };

    if (
      !payload.name ||
      !payload.categoryId ||
      payload.defaultShelfLifeHours < 1
    ) {
      alert('Preencha os campos corretamente.');
      return;
    }

    try {
      setIsSaving(true);

      if (editingId) {
        await api.patch(`/labels/items/${editingId}`, payload);
      } else {
        await api.post('/labels/items', payload);
      }

      resetForm();
      await loadItems();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      alert('Não foi possível salvar o item.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: LabelItem) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o item "${item.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item.id);
      await api.delete(`/labels/items/${item.id}`);

      if (editingId === item.id) {
        resetForm();
      }

      await loadItems();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      alert('Não foi possível excluir o item.');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.category.name.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [items, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Itens</h1>
        <p className="text-sm text-slate-600">
          Cadastre, edite e gerencie os itens que poderão gerar etiquetas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId ? 'Editar item' : 'Novo item'}
            </h2>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
              >
                Cancelar
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Nome</span>
              <input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="Ex.: Cenoura Picada"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
                maxLength={120}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Categoria
              </span>
              <select
                value={form.categoryId}
                onChange={(e) => updateForm('categoryId', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
                required
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Tipo</span>
              <select
                value={form.itemType}
                onChange={(e) =>
                  updateForm('itemType', e.target.value as LabelItemType)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
              >
                {itemTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Validade padrão em horas
              </span>
              <input
                type="number"
                min={1}
                value={form.defaultShelfLifeHours}
                onChange={(e) =>
                  updateForm('defaultShelfLifeHours', Number(e.target.value))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
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
                  : 'Salvar item'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Itens cadastrados
              </h2>
              <p className="text-sm text-slate-600">
                {filteredItems.length} item(ns) encontrado(s)
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou categoria"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900 sm:max-w-xs"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_120px_170px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <div>Nome</div>
              <div>Categoria</div>
              <div>Tipo</div>
              <div>Validade</div>
              <div>Ações</div>
            </div>

            {isLoading ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                Carregando itens...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                Nenhum item encontrado.
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_120px_170px] gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">
                      {item.name}
                    </div>
                  </div>

                  <div className="truncate text-slate-600">
                    {item.category.name}
                  </div>

                  <div className="text-slate-600">
                    {itemTypeOptions.find(
                      (option) => option.value === item.itemType,
                    )?.label ?? item.itemType}
                  </div>

                  <div className="text-slate-600">
                    {item.defaultShelfLifeHours}h
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === item.id ? 'Excluindo...' : 'Excluir'}
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