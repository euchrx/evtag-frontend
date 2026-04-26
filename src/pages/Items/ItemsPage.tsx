import { useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import {
  Box,
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

type LabelItemType = 'INPUT' | 'PRODUCTION' | 'FRACTIONED';

type Category = {
  id: string;
  name: string;
};

type LabelItem = {
  id: string;
  name: string;
  categoryId: string;
  category: Category;
  itemType: LabelItemType;
  defaultShelfLifeHours: number;
};

type LabelItemForm = {
  name: string;
  categoryId: string;
  itemType: LabelItemType;
  shelfLifeDays: number;
};

type SelectOption = {
  value: string;
  label: string;
};

const itemTypeOptions: SelectOption[] = [
  { value: 'INPUT', label: 'Insumo' },
  { value: 'PRODUCTION', label: 'Produção' },
  { value: 'FRACTIONED', label: 'Fracionado' },
];

const initialForm: LabelItemForm = {
  name: '',
  categoryId: '',
  itemType: 'INPUT',
  shelfLifeDays: 1,
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

  const { showToast } = useToast();

  useEffect(() => {
    void loadItems();
    void loadCategories();
  }, []);

  async function loadItems() {
    try {
      setIsLoading(true);
      const { data } = await api.get<LabelItem[]>('/labels/items');
      setItems(data);
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao carregar produtos'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const { data } = await api.get<Category[]>('/categories');
      setCategories(data);
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao carregar categorias'), 'error');
    }
  }

  function updateForm<K extends keyof LabelItemForm>(
    field: K,
    value: LabelItemForm[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      shelfLifeDays: Math.max(1, Math.round(item.defaultShelfLifeHours / 24)),
    });
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();

    if (!name || !form.categoryId || form.shelfLifeDays < 1) {
      showToast('Preencha os campos corretamente.', 'warning');
      return;
    }

    const payload = {
      name,
      categoryId: form.categoryId,
      itemType: form.itemType,
      defaultShelfLifeHours: form.shelfLifeDays * 24,
    };

    try {
      setIsSaving(true);

      if (editingId) {
        await api.patch(`/labels/items/${editingId}`, payload);
      } else {
        await api.post('/labels/items', payload);
      }

      resetForm();
      await loadItems();

      showToast(
        editingId
          ? 'Produto atualizado com sucesso.'
          : 'Produto criado com sucesso.',
        'success',
      );
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao salvar produto'), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: LabelItem) {
    try {
      setDeletingId(item.id);

      await api.delete(`/labels/items/${item.id}`);

      if (editingId === item.id) {
        resetForm();
      }

      await loadItems();

      showToast('Produto excluído com sucesso.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Erro ao excluir produto'), 'error');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.name.toLowerCase().includes(q),
    );
  }, [items, search]);

  const productionItems = useMemo(
    () => items.filter((item) => item.itemType === 'PRODUCTION').length,
    [items],
  );

  return (
    <div className="space-y-8 font-sans">
      <PageHeader
        isLoading={isLoading}
        onRefresh={async () => {
          await Promise.all([loadItems(), loadCategories()]);
        }}
        total={items.length}
        production={productionItems}
      />

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-evtag-border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-evtag-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-evtag-primary">
                Cadastro
              </div>

              <h2 className="mt-4 font-display text-xl font-extrabold text-evtag-text">
                {editingId ? 'Editar produto' : 'Novo produto'}
              </h2>

              <p className="mt-2 text-sm leading-6 text-evtag-muted">
                Cadastre produtos, insumos e preparações que poderão gerar
                etiquetas controladas.
              </p>
            </div>

            <div className="rounded-2xl bg-evtag-primary p-3 text-white">
              <Box size={22} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Nome do produto"
              value={form.name}
              onChange={(value) => updateForm('name', value)}
              placeholder="Ex.: Cenoura picada"
            />

            <Select
              label="Categoria"
              value={form.categoryId}
              onChange={(value) => updateForm('categoryId', value)}
              options={categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />

            <Select
              label="Tipo"
              value={form.itemType}
              onChange={(value) =>
                updateForm('itemType', value as LabelItemType)
              }
              options={itemTypeOptions}
            />

            <Input
              label="Validade padrão em dias"
              type="number"
              min={1}
              value={form.shelfLifeDays}
              onChange={(value) =>
                updateForm('shelfLifeDays', Math.max(1, Number(value)))
              }
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-evtag-primary px-5 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={17} />
                {isSaving
                  ? 'Salvando...'
                  : editingId
                    ? 'Salvar alterações'
                    : 'Criar produto'}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-evtag-border bg-white px-5 text-sm font-bold text-evtag-text transition hover:bg-evtag-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X size={17} />
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
                Produtos cadastrados
              </h2>

              <p className="mt-1 text-sm text-evtag-muted">
                {filteredItems.length} resultado(s) no escopo atual.
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
                placeholder="Buscar produto ou categoria"
                className="h-11 w-full rounded-2xl border border-evtag-border bg-white pl-11 pr-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:ring-4 focus:ring-evtag-light"
              />
            </div>
          </div>

          {isLoading ? (
            <EmptyMessage message="Carregando produtos..." />
          ) : filteredItems.length === 0 ? (
            <EmptyMessage message="Nenhum produto encontrado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-evtag-border text-sm">
                <thead className="bg-evtag-light/60">
                  <tr>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead align="right">Ações</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-evtag-border bg-white">
                  {filteredItems.map((item) => {
                    const isDeleting = deletingId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-evtag-light/60"
                      >
                        <td className="max-w-[320px] px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-evtag-light text-evtag-primary">
                              <Box size={18} />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-evtag-text">
                                {item.name}
                              </p>
                              <p className="mt-0.5 text-xs text-evtag-muted">
                                Item controlado para etiquetagem
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-medium text-evtag-muted">
                          {item.category.name}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <TypeBadge type={item.itemType} />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-medium text-evtag-muted">
                          {Math.max(
                            1,
                            Math.round(item.defaultShelfLifeHours / 24),
                          )}{' '}
                          dias
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              disabled={isDeleting}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-bold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Pencil size={15} />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDelete(item)}
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

function getItemTypeLabel(type: LabelItemType) {
  const option = itemTypeOptions.find((itemType) => itemType.value === type);
  return option?.label ?? type;
}

function PageHeader({
  isLoading,
  onRefresh,
  total,
  production,
}: {
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  total: number;
  production: number;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-evtag-text">
          Produtos
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-evtag-muted">
          Cadastre produtos, insumos e preparações utilizados na geração das
          etiquetas.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <HeaderStat label="Total" value={total} />
        <HeaderStat label="Produção" value={production} />

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

type InputProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
};

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  min,
}: InputProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-evtag-text">{label}</span>

      <input
        type={type}
        min={min}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
      />
    </label>
  );
}

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
};

function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-evtag-text">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
      >
        <option value="">Selecione</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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

function TypeBadge({ type }: { type: LabelItemType }) {
  const classNameMap: Record<LabelItemType, string> = {
    INPUT: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    PRODUCTION: 'bg-blue-50 text-blue-700 ring-blue-200',
    FRACTIONED: 'bg-amber-50 text-amber-700 ring-amber-200',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${classNameMap[type]}`}
    >
      {getItemTypeLabel(type)}
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