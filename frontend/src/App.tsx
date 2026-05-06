import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui'
import { AppSectionProvider } from '@/hooks/useAppSection'
import { useAppSection } from '@/hooks/useAppSection'
import { LibraryPage } from '@/pages/Library'
import { SpotifyConnect } from '@/pages/Connect/Spotify'
import { YTMusicConnect } from '@/pages/Connect/YTMusic'
import { MigratePage } from '@/pages/Migrate'
import { ReportsList } from '@/pages/Reports/List'
import { ReportDetail } from '@/pages/Reports/Detail'
import { downloadJson } from '@/lib/download'
import type { MigrationReport } from '@/types/api'

function AppContent() {
  const { section } = useAppSection()
  const [selectedReport, setSelectedReport] = useState<MigrationReport | null>(null)

  useEffect(() => {
    const main = document.getElementById('main-content');
    const heading = main?.querySelector('h2, h3');
    if (heading instanceof HTMLElement) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }, [section, selectedReport]);

  return (
    <AppShell>
      {section === 'connect' && (
        <div className="p-4 sm:p-6 flex flex-col gap-6">
          <SpotifyConnect />
          <YTMusicConnect />
        </div>
      )}
      {section === 'library' && <LibraryPage />}
      {section === 'migrate' && <MigratePage />}
      {section === 'reports' && selectedReport && (
        <div className="p-4 sm:p-6">
          <ReportDetail
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onDownload={(report) => {
              const filename = report.id
                ? `report-${report.id.slice(0, 8)}`
                : 'report';
              downloadJson(filename, report);
            }}
          />
        </div>
      )}
      {section === 'reports' && !selectedReport && (
        <div className="p-4 sm:p-6">
          <ReportsList onSelectReport={setSelectedReport} />
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
