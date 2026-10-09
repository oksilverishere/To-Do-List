import { useQuery } from '@tanstack/react-query'
import { listCategories } from '../api/category'
import { listCategoryTodos } from '../api/todo'

export interface CategoryCounts {
  pending: number
  done: number
  total: number
}

/**
 * Loads every category of the caller plus the to-dos inside each one, then
 * reduces them to `categoryId -> { pending, done, total }`. Used by the
 * Overview and Categories pages so every card shows live numbers.
 */
export function useCategoryCounts() {
  return useQuery({
    queryKey: ['categoryCounts'],
    queryFn: async () => {
      const categories = await listCategories()
      const lists = await Promise.all(
        categories.map((category) => listCategoryTodos(category.id)),
      )

      const counts: Record<string, CategoryCounts> = {}
      categories.forEach((category, index) => {
        const todos = lists[index]
        const pending = todos.filter((t) => t.status === 'pending').length
        counts[category.id] = {
          pending,
          done: todos.length - pending,
          total: todos.length,
        }
      })

      return { categories, counts }
    },
  })
}