import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/common/ProtectedRoute'
import GuestRoute from './components/common/GuestRoute'
import MainLayout from './components/layout/MainLayout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RolesPage from './pages/roles/RolesPage'
import UsersPage from './pages/users/UsersPage'

function Placeholder({ name }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-gray-400 text-sm">{name} modulu — tezliklə.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: '13px' },
        }}
      />
      <Routes>
        {/* Guest only */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="customers" element={<Placeholder name="Müştəri İdarəetməsi" />} />
            <Route path="contractors" element={<Placeholder name="Podratçı İdarəetməsi" />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="garage" element={<Placeholder name="Qaraj Modulu" />} />
            <Route path="requests" element={<Placeholder name="Sorğular Modulu" />} />
            <Route path="coordinator" element={<Placeholder name="Koordinator Modulu" />} />
            <Route path="projects" element={<Placeholder name="Layihələr Modulu" />} />
            <Route path="accounting" element={<Placeholder name="Mühasibatlıq Modulu" />} />
            <Route path="service" element={<Placeholder name="Texniki Servis Modulu" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
