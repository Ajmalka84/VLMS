import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Layers, AlertCircle, CheckCircle2, X } from 'lucide-react';
import {
  fetchExpenseCategoriesApi,
  createExpenseCategoryApi,
  updateExpenseCategoryApi,
  deleteExpenseCategoryApi,
  ExpenseCategory,
} from '../../api/expenses';
import { Card } from '../common/Card';
import { ConfirmModal } from '../common/ConfirmModal';

export const ExpenseCategoriesManagement: React.FC = () => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion Modal
  const [deletingCat, setDeletingCat] = useState<ExpenseCategory | null>(null);

  const loadCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchExpenseCategoriesApi();
      setCategories(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load expense categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCat(null);
    setCatName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: ExpenseCategory) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setFormError('Category name is required.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      if (editingCat) {
        await updateExpenseCategoryApi(editingCat.id, catName.trim());
      } else {
        await createExpenseCategoryApi(catName.trim());
      }
      setIsModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save expense category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCat) return;
    try {
      await deleteExpenseCategoryApi(deletingCat.id);
      setDeletingCat(null);
      await loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Expense Categories
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage cost heads for site expenditure (Diesel, Labour, Explosives, Maintenance, Food, etc.)
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-lg shadow-amber-500/20 cursor-pointer select-none touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 animate-pulse">Loading categories...</div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 font-semibold">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Category Name</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3.5 font-bold text-white flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    {cat.name}
                  </td>
                  <td className="px-4 py-3.5">
                    {cat.isDefault ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        System Default
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        Custom Head
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                        title="Edit Name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCat(cat)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingCat ? 'Edit Category Name' : 'Create Expense Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blasting & Explosives"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingCat && (
        <ConfirmModal
          isOpen={true}
          title="Delete Expense Category"
          message={`Are you sure you want to delete category "${deletingCat.name}"? Active expense records linked to this category will block deletion.`}
          confirmText="Delete Category"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeletingCat(null)}
        />
      )}
    </div>
  );
};
