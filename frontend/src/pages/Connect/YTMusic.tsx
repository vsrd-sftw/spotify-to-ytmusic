import { useCallback, useState } from 'react';
import { Button, FieldError, Label, Textarea } from '@/components/ui';
import { http } from '@/lib/http';
import { useYTMusicAuth } from '@/features/auth/useYTMusicAuth';
import { useHealth } from '@/features/auth/useHealth';
import { useInvalidateHealth } from '@/features/auth/useHealth';

export function YTMusicConnect() {
  const [headers, setHeaders] = useState('');
  const { state, errorMessage, connect } = useYTMusicAuth();
  const { ytmusic } = useHealth();
  const invalidateHealth = useInvalidateHealth();

  const isConnected = ytmusic === 'connected';

  const disconnect = useCallback(() => {
    http.delete('/auth/ytmusic').then(() => invalidateHealth());
  }, [invalidateHealth]);

  return (
    <section aria-labelledby="ytmusic-connect-heading" className="flex flex-col gap-4 p-8">
      <h2 id="ytmusic-connect-heading" className="text-xl font-semibold text-gray-100">
        Conectar YouTube Music
      </h2>

      {isConnected ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-green-700">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs">
              ✓
            </span>
            Conectado a YouTube Music
          </p>
          <div>
            <Button onClick={disconnect} className="bg-red-600 hover:bg-red-700">
              Desconectar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400">
            Para autenticar con YouTube Music necesitas capturar los headers de tu navegador:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
            <li>Abre <strong>YouTube Music</strong> en Chrome o Firefox.</li>
            <li>Abre las DevTools (F12) y ve a la pestaña <strong>Network</strong>.</li>
            <li>Recarga la página y filtra las peticiones por <code>browse</code>.</li>
            <li>Haz clic en cualquier petición a <code>browse</code> y en la sección <strong>Request Headers</strong> copia el bloque entero (incluye <code>x-goog-authuser</code>, <code>cookie</code> y <code>user-agent</code>).</li>
            <li>Pega los headers aquí y pulsa «Conectar».</li>
          </ol>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ytmusic-headers">Headers del navegador</Label>
            <Textarea
              id="ytmusic-headers"
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              rows={8}
              placeholder="Pega aquí los headers copiados de DevTools..."
            />
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <Button
                onClick={() => connect(headers)}
                disabled={headers.trim().length === 0 || state === 'submitting' || state === 'success'}
                loading={state === 'submitting'}
              >
                Conectar con YouTube Music
              </Button>
            </div>
            {errorMessage && <FieldError>{errorMessage}</FieldError>}
          </div>
        </>
      )}
    </section>
  );
}
