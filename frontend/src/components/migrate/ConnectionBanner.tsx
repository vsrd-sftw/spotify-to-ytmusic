import { Button } from '@/components/ui';
import type { WsState } from '@/hooks/useMigrationEvents';

interface ConnectionBannerProps {
  state: WsState;
  retryCount: number;
  onRetry: () => void;
}

export function ConnectionBanner({ state, retryCount, onRetry }: ConnectionBannerProps) {
  if (state !== 'reconnecting' && state !== 'exhausted') {
    return null;
  }

  const isExhausted = state === 'exhausted';

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-md ${
        isExhausted ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
      }`}
    >
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${isExhausted ? 'text-red-800' : 'text-yellow-800'}`}>
          {isExhausted ? 'Conexión perdida' : 'Conexión perdida — reintentando…'}
        </span>
        {!isExhausted && (
          <span className="text-xs text-yellow-600">
            Intento {retryCount} de 5
          </span>
        )}
      </div>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {isExhausted ? 'Reintentar' : 'Reintentar ahora'}
      </Button>
    </div>
  );
}
