import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { RequireAdmin, RequireAnonymous, RequireAuth } from './components/guards'
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage'
import { AdminSignInPage } from './pages/admin/AdminSignInPage'
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { SignInPage } from './pages/auth/SignInPage'
import { SignUpPage } from './pages/auth/SignUpPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { CategoryDetailPage } from './pages/CategoryDetailPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OverviewPage } from './pages/OverviewPage'
import { ProfilePage } from './pages/ProfilePage'
import { TodosPage } from './pages/TodosPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RequireAnonymous />}>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/admin/sign-in" element={<AdminSignInPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/categories/:id" element={<CategoryDetailPage />} />
            <Route path="/todos" element={<TodosPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminOverviewPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}