import React, { useState, useEffect } from 'react';
import { useFeedback } from './ui/feedback';
import { API_BASE, TOKEN_KEY } from '../data/constants';

const CATEGORIES_API = `${API_BASE}/api/settings/categories`;

type Category = {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  product_count: number;
};

type Props = {
  onClose?: () => void;
  onCategoryChanged?: () => void;
  existingInventoryCategories?: string[];
};

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:z-10 placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed';

export default function CategoryManagement({ onClose, onCategoryChanged, existingInventoryCategories = [] }: Props) {
  const { notify } = useFeedback();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(CATEGORIES_API, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      const loadedCategories: Category[] = Array.isArray(data) ? data : [];
      const knownNames = new Set(loadedCategories.map((category) => category.name.trim().toLowerCase()));
      const missingNames = existingInventoryCategories
        .map((category) => category.trim())
        .filter((category, index, all) => category && all.findIndex((item) => item.toLowerCase() === category.toLowerCase()) === index)
        .filter((category) => !knownNames.has(category.toLowerCase()));

      const importedCategories = await Promise.all(missingNames.map(async (name) => {
        const createResponse = await fetch(CATEGORIES_API, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name, description: 'Imported from existing inventory' }),
        });
        if (!createResponse.ok) return null;
        return await createResponse.json() as Category;
      }));

      setCategories([...loadedCategories, ...importedCategories.filter(Boolean) as Category[]]);
    } catch (error) {
      notify({
        type: 'error',
        title: 'Failed to load categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      notify({
        type: 'warning',
        title: 'Category name required',
        message: 'Please enter a category name',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(CATEGORIES_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDesc.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create category');
      }

      const newCategory = await response.json();
      setCategories((currentCategories) => [...currentCategories, newCategory]);
      setNewCategoryName('');
      setNewCategoryDesc('');

      notify({
        type: 'success',
        title: 'Category added',
        message: `${newCategory.name} has been added to inventory`,
      });

      if (onCategoryChanged) {
        onCategoryChanged();
      }
    } catch (error) {
      notify({
        type: 'error',
        title: 'Failed to add category',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Update category
  const handleUpdateCategory = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`${CATEGORIES_API}/${editingId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editingName.trim(),
          description: editingDesc.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update category');
      }

      const updated = await response.json();
      setCategories(categories.map(c => c.id === editingId ? updated : c));
      setEditingId(null);
      setEditingName('');
      setEditingDesc('');

      notify({
        type: 'success',
        title: 'Category updated',
        message: `${updated.name} has been updated`,
      });

      if (onCategoryChanged) {
        onCategoryChanged();
      }
    } catch (error) {
      notify({
        type: 'error',
        title: 'Failed to update category',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: number, name: string) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;

    try {
      setLoading(true);
      const response = await fetch(`${CATEGORIES_API}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete category');
      }

      setCategories(categories.filter(c => c.id !== id));

      notify({
        type: 'success',
        title: 'Category deleted',
        message: `${name} has been removed`,
      });

      if (onCategoryChanged) {
        onCategoryChanged();
      }
    } catch (error) {
      notify({
        type: 'error',
        title: 'Failed to delete category',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Category Management
        </h4>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Add New Category */}
      <div className="space-y-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border border-emerald-100">
        <h5 className="text-xs font-bold uppercase tracking-wide text-emerald-700">Add New Category</h5>
        <div className="grid gap-2 md:grid-cols-3 items-end">
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category Name
            </span>
            <input
              type="text"
              className={INPUT_CLASS}
              placeholder="e.g., Oral Solids"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={loading}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description (optional)
            </span>
            <input
              type="text"
              className={INPUT_CLASS}
              placeholder="e.g., Tablets, capsules..."
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={loading}
            />
          </label>
          <button
            onClick={handleAddCategory}
            disabled={loading || !newCategoryName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <h5 className="text-xs font-bold uppercase tracking-wide text-slate-600">Existing Categories</h5>
        {loading && !categories.length ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-slate-500">Loading categories...</div>
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-500">No categories yet. Add one to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100"
              >
                {editingId === category.id ? (
                  <div className="flex-1 grid gap-2 md:grid-cols-3 items-center mr-2">
                    <input
                      type="text"
                      className={INPUT_CLASS}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                    <input
                      type="text"
                      className={INPUT_CLASS}
                      value={editingDesc}
                      onChange={(e) => setEditingDesc(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={handleUpdateCategory}
                        disabled={loading}
                        className="flex-1 rounded-lg bg-emerald-600 text-white px-2 py-1 text-xs font-bold hover:bg-emerald-700 disabled:opacity-60"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={loading}
                        className="flex-1 rounded-lg bg-slate-300 text-slate-700 px-2 py-1 text-xs font-bold hover:bg-slate-400 disabled:opacity-60"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{category.name}</p>
                      {category.description && (
                        <p className="text-xs text-slate-500">{category.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {category.product_count} product(s) • {category.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingId(category.id);
                          setEditingName(category.name);
                          setEditingDesc(category.description || '');
                        }}
                        disabled={loading}
                        className="rounded-lg bg-blue-50 text-blue-600 px-3 py-1.5 text-xs font-bold hover:bg-blue-100 transition disabled:opacity-60"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        disabled={loading || category.product_count > 0}
                        className="rounded-lg bg-red-50 text-red-600 px-3 py-1.5 text-xs font-bold hover:bg-red-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        title={category.product_count > 0 ? 'Cannot delete category with products' : 'Delete category'}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
