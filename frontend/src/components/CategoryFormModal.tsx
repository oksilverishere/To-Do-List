import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Input, Modal, Textarea } from './ui'
import { getApiErrorMessage } from '../lib/errors'
import type { Category } from '../types/api'

/** Shared create/edit dialog for a category (title + bio). */
export function CategoryFormModal({
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
  initial?: Category
  submitting: boolean
  onSubmit: (body: { title: string; bio: string }) => Promise<void>
}) {
  const [categoryTitle, setCategoryTitle] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setCategoryTitle(initial?.title ?? '')
      setBio(initial?.bio ?? '')
      setError('')
    }
  }, [open, initial])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await onSubmit({ title: categoryTitle.trim(), bio: bio.trim() })
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
          maxLength={50}
          required
          placeholder="e.g. Programming"
          value={categoryTitle}
          onChange={(e) => setCategoryTitle(e.target.value)}
        />
        <Textarea
          label="Description"
          maxLength={500}
          required
          placeholder="What is this category about?"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
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