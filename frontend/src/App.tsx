import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui'
import { SelectionProvider } from '@/contexts/SelectionContext'
import { LibraryPage } from '@/pages/Library'
import { ConnectPage } from '@/pages/Connect'
import { MigratePage } from '@/pages/Migrate'
import { ReportsListPage, ReportDetailPage } from '@/pages/Reports'

function App() {
  return (
    <ToastProvider>
      <SelectionProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/connect" replace />} />
            <Route path="/connect" element={<ConnectPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/migrate" element={<MigratePage />} />
            <Route path="/reports" element={<ReportsListPage />} />
            <Route path="/reports/:id" element={<ReportDetailPage />} />
            <Route path="*" element={<Navigate to="/connect" replace />} />
          </Routes>
        </AppShell>
      </SelectionProvider>
    </ToastProvider>
  )
}

export default App
