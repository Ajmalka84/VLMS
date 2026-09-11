import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Layers, AlertCircle } from 'lucide-react';
import {
  fetchExpenseCategoriesApi,
  createExpenseCategoryApi,
  updateExpenseCategoryApi,
  deleteExpenseCategoryApi,
  ExpenseCategory,
} from '../../api/expenses';
import { Card, ConfirmModal, Modal, Input, Button, Badge, EmptyState } from '../common';

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
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Expense Categories
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Manage cost heads for site expenditure (Diesel, Labour, Explosives, Maintenance, Food, etc.)
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted animate-pulse">Loading categories...</div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 font-semibold">{error}</div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8 text-amber-400" />}
          title="No Expense Categories"
          description="Create your first cost head category to categorize operational site expenses."
          actionText="Add Category"
          onAction={openCreateModal}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-subtle bg-surface shadow-xl">
          <table className="w-full text-left text-sm text-secondary">
            <thead className="bg-surface-solid text-[11px] uppercase font-bold tracking-wider text-secondary border-b border-subtle">
              <tr>
                <th className="px-4 py-3.5">Category Name</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-surface-hover transition">
                  <td className="px-4 py-3.5 font-bold text-primary flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    {cat.name}
                  </td>
                  <td className="px-4 py-3.5">
                    {cat.isDefault ? (
                      <Badge variant="slate" size="sm">System Default</Badge>
                    ) : (
                      <Badge variant="amber" size="sm">Custom Head</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 text-muted hover:text-amber-400 hover:bg-surface-hover rounded-lg transition"
                        title="Edit Name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCat(cat)}
                        className="p-1.5 text-muted hover:text-rose-400 hover:bg-surface-hover rounded-lg transition"
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
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCat ? 'Edit Category Name' : 'Create Expense Category'}
        maxWidth="sm"
      >
        {formError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Category Name"
            required
            placeholder="e.g. Blasting & Explosives"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-subtle">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
            >
              Save Category
            </Button>
          </div>
        </form>
      </Modal>

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
