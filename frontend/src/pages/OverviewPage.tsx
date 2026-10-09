import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCategoryCounts } from '../hooks/useCategoryCounts'
import { PageHeader } from '../components/PageHeader'
import { Button, Card, EmptyState, Spinner } from '../components/ui'

export function OverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading } = useCategoryCounts()

  if (isLoading) return <Spinner label="Loading your workspace…" />

  const categories = data?.categories ?? []
  const counts = data?.counts ?? {}
  const totalPending = Object.values(counts).reduce((sum, c) => sum + c.pending, 0)
  const totalDone = Object.values(counts).reduce((sum, c) => sum + c.done, 0)
  const totalTodos = totalPending + totalDone
  const recent = categories.slice(0, 3)

  const stats = [
    { label: 'Categories', value: categories.length, icon: FolderKanban, tone: 'text-indigo-400' },
    { label: 'Pending tasks', value: totalPending, icon: ListTodo, tone: 'text-amber-400' },
    { label: 'Done tasks', value: totalDone, icon: CheckCircle2, tone: 'text-emerald-400' },
  ]

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name ?? 'friend'}`}
        description="Here is a snapshot of your tasks."
        actions={
          <Button onClick={() => navigate('/categories')}>
            <Plus className="size-4" /> New category
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="flex items-center gap-4">
              <span
                className={`flex size-11 items-center justify-center rounded-lg bg-slate-800 ${stat.tone}`}
              >
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-semibold text-white">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Sparkles className="size-4 text-indigo-400" />
        <h2 className="font-semibold text-white">
          Recent categories ({totalTodos} tasks in total)
        </h2>
      </div>

      {recent.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon={FolderKanban}
            title="No categories yet"
            description="Create your first category to start organising your to-dos."
          />
        </Card>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {recent.map((category) => {
            const count = counts[category.id]
            return (
              <Link key={category.id} to={`/categories/${category.id}`}>
                <Card className="h-full transition hover:border-indigo-500/50 hover:bg-slate-900">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-white">{category.title}</p>
                    <ArrowRight className="size-4 text-slate-500" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                    {category.bio}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    {count.total === 0
                      ? 'No tasks yet'
                      : `${count.pending} pending · ${count.done} done`}
                  </p>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <Link to="/categories">
          <Button variant="ghost">Open categories</Button>
        </Link>
        <Link to="/todos">
          <Button variant="ghost">Search all to-dos</Button>
        </Link>
      </div>
    </div>
  )
}