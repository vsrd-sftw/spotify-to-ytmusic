import { AppShell } from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui'
import { AppSectionProvider } from '@/hooks/useAppSection'
import { useAppSection } from '@/hooks/useAppSection'
import { LibraryPage } from '@/pages/Library'
import { SpotifyConnect } from '@/pages/Connect/Spotify'
import { YTMusicConnect } from '@/pages/Connect/YTMusic'

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
      {section === 'migrate' && (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Migración (próximamente)
        </div>
      )}
      {section === 'reports' && (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Reportes (próximamente)
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
