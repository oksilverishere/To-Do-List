import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FolderX, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createTodo,
  deleteTodo,
  editTodo,
  listCategoryTodos,
  changeTodoStatus,
} from '../api/todo'
import { deleteCategory, editCategory, getCategory } from '../api/category'
import { CategoryFormModal } from '../components/CategoryFormModal'
import { PageHeader } from '../components/PageHeader'
import { TodoCard } from '../components/TodoCard'
import { TodoFormModal } from '../components/TodoFormModal'
import { Button, Card, ConfirmDialog, EmptyState, Spinner } from '../components/ui'
import { useNotify } from '../hooks/useToast'
import { getApiErrorMessage } from '../lib/errors'
import type { Category, CreateCategoryBody, Todo, TodoPriority } from '../types/api'

type TodoModal = { mode: 'create' } | { mode: 'edit'; todo: Todo } | null

export function CategoryDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useNotify()
  const queryClient = useQueryClient()

  const [todoModal, setTodoModal] = useState<TodoModal>(null)
  const [editingCategory, setEditingCategory] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null)

  const categoryQuery = useQuery({
    queryKey: ['category', id],
    queryFn: () => getCategory(id),
  })

  const todosQuery = useQuery({
    queryKey: ['todos', 'category', id],
    queryFn: () => listCategoryTodos(id),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['todos', 'category', id] })
    queryClient.invalidateQueries({ queryKey: ['category', id] })
    queryClient.invalidateQueries({ queryKey: ['categoryCounts'] })
  }

  const createMutation = useMutation({
    mutationFn: (body: { title: string; bio: string; priority: TodoPriority }) =>
      createTodo({ ...body, categoryId: id }),
    onSuccess: () => {
      toast.success('To-do created')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const editTodoMutation = useMutation({
    mutationFn: (args: { todoId: string; body: { title: string; bio: string; priority: TodoPriority } }) =>
      editTodo(args.todoId, args.body),
    onSuccess: () => {
      toast.success('To-do updated')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const toggleMutation = useMutation({
    mutationFn: (args: { todoId: string; status: Todo['status'] }) =>
      changeTodoStatus(args.todoId, args.status),
    onSuccess: () => {
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteTodoMutation = useMutation({
    mutationFn: (todoId: string) => deleteTodo(todoId),
    onSuccess: () => {
      toast.success('To-do deleted')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const editCategoryMutation = useMutation({
    mutationFn: (body: Partial<CreateCategoryBody>) => editCategory(id, body),
    onSuccess: () => {
      toast.success('Category updated')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: () => deleteCategory(id),
    onSuccess: () => {
      toast.success('Category and its to-dos deleted')
      queryClient.invalidateQueries({ queryKey: ['categoryCounts'] })
      navigate('/categories', { replace: true })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (categoryQuery.isLoading || todosQuery.isLoading) {
    return <Spinner label="Loading category…" />
  }

  if (categoryQuery.isError) {
    return (
      <Card>
        <EmptyState
          icon={FolderX}
          title="Category not found"
          description="It may have been deleted, or it belongs to another account."
        />
        <div className="flex justify-center">
          <Link to="/categories">
            <Button variant="ghost">
              <ArrowLeft className="size-4" /> Back to categories
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  const category = categoryQuery.data as Category
  const todos = todosQuery.data ?? []

  return (
    <div>
      <Link
        to="/categories"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft className="size-4" /> Categories
      </Link>

      <PageHeader
        title={category.title}
        description={category.bio}
        actions={
          <>
            <Button variant="ghost" onClick={() => setEditingCategory(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button variant="danger" onClick={() => setDeletingCategory(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
            <Button onClick={() => setTodoModal({ mode: 'create' })}>
              <Plus className="size-4" /> New to-do
            </Button>
          </>
        }
      />

      {todos.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderX}
            title="No to-dos here"
            description="Add your first task to this category."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {todos.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              disabled={toggleMutation.isPending}
              onToggle={() =>
                toggleMutation.mutate({
                  todoId: todo.id,
                  status: todo.status === 'done' ? 'pending' : 'done',
                })
              }
              onEdit={(t) => setTodoModal({ mode: 'edit', todo: t })}
              onDelete={(t) => setDeletingTodo(t)}
            />
          ))}
        </div>
      )}

      <TodoFormModal
        open={todoModal !== null}
        onClose={() => setTodoModal(null)}
        title={todoModal?.mode === 'edit' ? 'Edit to-do' : 'New to-do'}
        initial={todoModal?.mode === 'edit' ? todoModal.todo : undefined}
        submitting={createMutation.isPending || editTodoMutation.isPending}
        onSubmit={async (body) => {
          if (todoModal?.mode === 'edit') {
            await editTodoMutation.mutateAsync({
              todoId: todoModal.todo.id,
              body,
            })
          } else {
            await createMutation.mutateAsync(body)
          }
        }}
      />

      <CategoryFormModal
        open={editingCategory}
        onClose={() => setEditingCategory(false)}
        title="Edit category"
        initial={category}
        submitting={editCategoryMutation.isPending}
        onSubmit={async (body) => {
            await editCategoryMutation.mutateAsync(body)
          }}
      />

      <ConfirmDialog
        open={deletingCategory}
        onClose={() => setDeletingCategory(false)}
        onConfirm={() => deleteCategoryMutation.mutateAsync()}
        title="Delete category?"
        message={`"${category.title}" and every to-do inside it will be deleted.`}
        loading={deleteCategoryMutation.isPending}
      />

      <ConfirmDialog
        open={deletingTodo !== null}
        onClose={() => setDeletingTodo(null)}
        onConfirm={() => {
          if (deletingTodo) {
            deleteTodoMutation.mutateAsync(deletingTodo.id).then(() => setDeletingTodo(null))
          }
        }}
        title="Delete to-do?"
        message={`"${deletingTodo?.title}" will be removed. The category stays.`}
        loading={deleteTodoMutation.isPending}
      />
    </div>
  )
}