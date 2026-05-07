import { Button } from '@/components/ui';

export interface SelectionSummaryProps {
  playlistCount: number;
  albumCount: number;
  onMigrate: () => void;
}

export function SelectionSummary({ playlistCount, albumCount, onMigrate }: SelectionSummaryProps) {
  const isEmpty = playlistCount + albumCount === 0;

  const parts: string[] = [];
  if (playlistCount > 0) parts.push(`${playlistCount} playlist${playlistCount !== 1 ? 's' : ''}`);
  if (albumCount > 0) parts.push(`${albumCount} álbum${albumCount !== 1 ? 'es' : ''}`);
  const label = isEmpty ? 'Ningún elemento seleccionado' : `${parts.join(', ')} seleccionado${parts.length > 1 || playlistCount + albumCount > 1 ? 's' : ''}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t border-gray-700 bg-gray-900 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <span className="text-sm text-gray-400">{label}</span>
      <Button onClick={onMigrate} disabled={isEmpty}>
        Migrar
      </Button>
    </div>
  );
}
