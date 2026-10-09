import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Input, Modal, Select, Textarea } from './ui'
import { getApiErrorMessage } from '../lib/errors'
import type { Todo, TodoPriority } from '../types/api'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

/** Shared create/edit dialog for a to-do. */
export function TodoFormModal({
  open,
  onClose,
  title,
  initial,
  submitting,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  title: string
  initial?: Todo
  submitting: boolean
  onSubmit: (body: {
    title: string
    bio: string
    priority: TodoPriority
  }) => Promise<void>
}) {
  const [todoTitle, setTodoTitle] = useState('')
  const [bio, setBio] = useState('')
  const [priority, setPriority] = useState<TodoPriority>('medium')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setTodoTitle(initial?.title ?? '')
      setBio(initial?.bio ?? '')
      setPriority(initial?.priority ?? 'medium')
      setError('')
    }
  }, [open, initial])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await onSubmit({
        title: todoTitle.trim(),
        bio: bio.trim(),
        priority,
      })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Title"
          minLength={2}
          maxLength={100}
          required
          placeholder="Task title"
          value={todoTitle}
          onChange={(e) => setTodoTitle(e.target.value)}
        />
        <Textarea
          label="Description"
          maxLength={500}
          required
          placeholder="What needs to be done?"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <Select
          label="Priority"
          options={PRIORITY_OPTIONS}
          value={priority}
          onChange={(e) => setPriority(e.target.value as TodoPriority)}
        />
        {error && <p className="field-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}