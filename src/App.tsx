import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage, LoginPage } from './pages'
import { RequireAuth } from './auth'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
