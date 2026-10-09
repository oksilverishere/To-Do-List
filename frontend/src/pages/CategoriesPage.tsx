import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react'
import { createCategory, deleteCategory, editCategory } from '../api/category'
import { CategoryFormModal } from '../components/CategoryFormModal'
import { PageHeader } from '../components/PageHeader'
import { Button, Card, ConfirmDialog, EmptyState, Spinner } from '../components/ui'
import { useCategoryCounts } from '../hooks/useCategoryCounts'
import { useNotify } from '../hooks/useToast'
import { getApiErrorMessage } from '../lib/errors'
import type { Category, CreateCategoryBody } from '../types/api'

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; category: Category }
  | null

export function CategoriesPage() {
  const { data, isLoading } = useCategoryCounts()
  const navigate = useNavigate()
  const toast = useNotify()
  const queryClient = useQueryClient()

  const [modal, setModal] = useState<ModalState>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['categoryCounts'] })

  const createMutation = useMutation({
    mutationFn: (body: CreateCategoryBody) => createCategory(body),
    onSuccess: () => {
      toast.success('Category created')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const editMutation = useMutation({
    mutationFn: (args: { id: string; body: Partial<CreateCategoryBody> }) =>
      editCategory(args.id, args.body),
    onSuccess: () => {
      toast.success('Category updated')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      toast.success('Category and its to-dos deleted')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (isLoading) return <Spinner label="Loading your categories…" />

  const categories = data?.categories ?? []
  const counts = data?.counts ?? {}

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Groups that keep your to-dos organised."
        actions={
          <Button onClick={() => setModal({ mode: 'create' })}>
            <Plus className="size-4" /> New category
          </Button>
        }
      />

      {categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No categories yet"
            description="Create your first category and start adding to-dos to it."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const count = counts[category.id]
            return (
              <Card
                key={category.id}
                className="cursor-pointer transition hover:border-indigo-500/50 hover:bg-slate-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => navigate(`/categories/${category.id}`)}
                    >
                      <p className="truncate font-medium text-white">
                        {category.title}
                      </p>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setModal({ mode: 'edit', category })}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                        title="Edit category"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(category)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-400"
                        title="Delete category"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-1 w-full text-left"
                    onClick={() => navigate(`/categories/${category.id}`)}
                  >
                    <p className="line-clamp-2 text-sm text-slate-400">
                      {category.bio}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {count.total === 0
                        ? 'No tasks yet'
                        : `${count.pending} pending · ${count.done} done`}
                    </p>
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <CategoryFormModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Edit category' : 'New category'}
        initial={modal?.mode === 'edit' ? modal.category : undefined}
        submitting={createMutation.isPending || editMutation.isPending}
        onSubmit={async (body) => {
          if (modal?.mode === 'edit') {
            await editMutation.mutateAsync({ id: modal.category.id, body })
          } else {
            await createMutation.mutateAsync(body)
          }
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            deleteMutation.mutateAsync(deleting.id).then(() => setDeleting(null))
          }
        }}
        title="Delete category?"
        message={`"${deleting?.title}" and every to-do inside it will be deleted. This cannot be undone.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}