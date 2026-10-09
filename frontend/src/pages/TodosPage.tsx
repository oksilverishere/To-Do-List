import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListTodo, Search } from 'lucide-react'
import { changeTodoStatus, deleteTodo, editTodo, searchTodos } from '../api/todo'
import { PageHeader } from '../components/PageHeader'
import { TodoCard } from '../components/TodoCard'
import { TodoFormModal } from '../components/TodoFormModal'
import { Card, ConfirmDialog, EmptyState, Select, Spinner } from '../components/ui'
import { useNotify } from '../hooks/useToast'
import { getApiErrorMessage } from '../lib/errors'
import type {
  SearchTodoParams,
  Todo,
  TodoPriority,
  TodoStatus,
} from '../types/api'

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'pending', label: 'Pending' },
  { value: 'done', label: 'Done' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Any priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const SORT_OPTIONS = [
  { value: 'name', label: 'Sort by name' },
  { value: 'priority', label: 'Sort by priority' },
  { value: 'status', label: 'Sort by status' },
]

export function TodosPage() {
  const toast = useNotify()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [status, setStatus] = useState<TodoStatus | ''>('')
  const [priority, setPriority] = useState<TodoPriority | ''>('')
  const [sortBy, setSortBy] = useState<'name' | 'priority' | 'status'>('name')
  const [modal, setModal] = useState<Todo | null>(null)
  const [deleting, setDeleting] = useState<Todo | null>(null)

  const params = useMemo<SearchTodoParams>(() => {
    const next: SearchTodoParams = { sortBy }
    if (name.trim()) next.name = name.trim()
    if (status) next.status = status
    if (priority) next.priority = priority
    return next
  }, [name, status, priority, sortBy])

  const todosQuery = useQuery({
    queryKey: ['todos', 'search', params],
    queryFn: () => searchTodos(params),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['todos', 'search'] })
    queryClient.invalidateQueries({ queryKey: ['categoryCounts'] })
  }

  const editMutation = useMutation({
    mutationFn: (args: {
      id: string
      body: { title: string; bio: string; priority: TodoPriority }
    }) => editTodo(args.id, args.body),
    onSuccess: () => {
      toast.success('To-do updated')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const toggleMutation = useMutation({
    mutationFn: (args: { id: string; status: TodoStatus }) =>
      changeTodoStatus(args.id, args.status),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onSuccess: () => {
      toast.success('To-do deleted')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const todos = todosQuery.data ?? []

  return (
    <div>
      <PageHeader
        title="All to-dos"
        description="Search across every category of your account."
      />

      <Card className="mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label htmlFor="todo-search" className="label">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
            <input
              id="todo-search"
              className="input pl-9"
              placeholder="Type a task name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value as TodoStatus | '')}
        />
        <Select
          label="Priority"
          options={PRIORITY_OPTIONS}
          value={priority}
          onChange={(e) => setPriority(e.target.value as TodoPriority | '')}
        />
        <Select
          label="Sort"
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as 'name' | 'priority' | 'status')
          }
        />
      </Card>

      {todosQuery.isLoading ? (
        <Spinner label="Searching…" />
      ) : todos.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListTodo}
            title="No matching to-dos"
            description="Try changing the filters, or add a new to-do inside a category."
          />
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {todos.length} result{todos.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-col gap-3">
            {todos.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                disabled={toggleMutation.isPending}
                onToggle={() =>
                  toggleMutation.mutate({
                    id: todo.id,
                    status: todo.status === 'done' ? 'pending' : 'done',
                  })
                }
                onEdit={(t) => setModal(t)}
                onDelete={(t) => setDeleting(t)}
              />
            ))}
          </div>
        </>
      )}

      <TodoFormModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title="Edit to-do"
        initial={modal ?? undefined}
        submitting={editMutation.isPending}
        onSubmit={async (body) => {
          if (modal) {
            await editMutation.mutateAsync({ id: modal.id, body })
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
        title="Delete to-do?"
        message={`"${deleting?.title}" will be removed. The category stays.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}