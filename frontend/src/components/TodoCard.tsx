import { Check, Pencil, Trash2 } from 'lucide-react'
import { Badge } from './ui'
import type { BadgeTone } from './ui'
import type { Todo, TodoPriority } from '../types/api'

const PRIORITY_TONES: Record<TodoPriority, BadgeTone> = {
  low: 'sky',
  medium: 'amber',
  high: 'rose',
}

/** One to-do row: status toggle, title, bio and the edit/delete buttons. */
export function TodoCard({
  todo,
  onToggle,
  onEdit,
  onDelete,
  disabled = false,
}: {
  todo: Todo
  onToggle: () => void
  onEdit: (todo: Todo) => void
  onDelete: (todo: Todo) => void
  disabled?: boolean
}) {
  const done = todo.status === 'done'

  return (
    <div className="card flex items-start gap-3 p-4">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={done ? 'Mark as pending' : 'Mark as done'}
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition ${
          done
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/10'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {done && <Check className="size-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`font-medium ${
              done ? 'text-slate-500 line-through' : 'text-slate-100'
            }`}
          >
            {todo.title}
          </p>
          <Badge tone={done ? 'emerald' : 'slate'}>
            {done ? 'Done' : 'Pending'}
          </Badge>
          <Badge tone={PRIORITY_TONES[todo.priority]}>{todo.priority}</Badge>
        </div>
        {todo.bio && <p className="mt-1 text-sm text-slate-400">{todo.bio}</p>}
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => onEdit(todo)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          title="Edit"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(todo)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-400"
          title="Delete"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}