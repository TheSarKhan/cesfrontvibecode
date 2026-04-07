import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/common/ProtectedRoute'
import GuestRoute from './components/common/GuestRoute'
import MainLayout from './components/layout/MainLayout'
import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import RolesPage from './pages/roles/RolesPage'
import UsersPage from './pages/users/UsersPage'
import ContractorsPage from './pages/contractors/ContractorsPage'
import InvestorsPage from './pages/investors/InvestorsPage'
import GaragePage from './pages/garage/GaragePage'
import CustomersPage from './pages/customers/CustomersPage'
import RequestsPage from './pages/requests/RequestsPage'
import CoordinatorPage from './pages/coordinator/CoordinatorPage'
import ProjectsPage from './pages/projects/ProjectsPage'
import AccountingPage from './pages/accounting/AccountingPage'
import ServicePage from './pages/service/ServicePage'
import OperatorsPage from './pages/operators/OperatorsPage'
import ApprovalPage from './pages/approval/ApprovalPage'
import TrashPage from './pages/trash/TrashPage'
import AuditPage from './pages/audit/AuditPage'
import ConfigPage from './pages/config/ConfigPage'

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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="contractors" element={<ContractorsPage />} />
            <Route path="investors" element={<InvestorsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="garage" element={<GaragePage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="coordinator" element={<CoordinatorPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="accounting" element={<AccountingPage />} />
            <Route path="service" element={<ServicePage />} />
            <Route path="operators" element={<OperatorsPage />} />
            <Route path="approval" element={<ApprovalPage />} />
            <Route path="trash" element={<TrashPage />} />
            <Route path="config" element={<ConfigPage />} />
            <Route path="audit" element={<AuditPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
