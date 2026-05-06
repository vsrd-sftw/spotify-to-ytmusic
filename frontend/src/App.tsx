import { AppShell } from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui'
import { AppSectionProvider } from '@/hooks/useAppSection'
import { useAppSection } from '@/hooks/useAppSection'
import { LibraryPage } from '@/pages/Library'
import { SpotifyConnect } from '@/pages/Connect/Spotify'
import { YTMusicConnect } from '@/pages/Connect/YTMusic'
import { MigratePage } from '@/pages/Migrate'
import { ReportsList } from '@/pages/Reports/List'

function AppContent() {
  const { section } = useAppSection()

  return (
    <AppShell>
      {section === 'connect' && (
        <div className="p-4 flex flex-col gap-6">
          <SpotifyConnect />
          <YTMusicConnect />
        </div>
      )}
      {section === 'library' && <LibraryPage />}
      {section === 'migrate' && <MigratePage />}
      {section === 'reports' && (
        <div className="p-4">
          <ReportsList />
        </div>
      )}
    </AppShell>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppSectionProvider>
        <AppContent />
      </AppSectionProvider>
    </ToastProvider>
  )
}

export default App
