import { useState } from 'react';
import { Button, Label, Textarea } from '@/components/ui';

export function YTMusicConnect() {
  const [headers, setHeaders] = useState('');

  return (
    <section aria-labelledby="ytmusic-connect-heading" className="flex flex-col gap-4 p-8">
      <h2 id="ytmusic-connect-heading" className="text-xl font-semibold text-gray-900">
        Conectar YouTube Music
      </h2>
      <p className="text-sm text-gray-600">
        Para autenticar con YouTube Music necesitas capturar los headers de tu navegador:
      </p>
      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
        <li>Abre YouTube Music en Chrome o Firefox.</li>
        <li>Abre las DevTools (F12) y ve a la pestaña <strong>Network</strong>.</li>
        <li>Recarga la página y filtra las peticiones por <code>browse</code>.</li>
        <li>Haz clic en cualquier petición a <code>browse</code> y copia los headers de la sección <strong>Request Headers</strong>.</li>
        <li>Pega los headers en el campo de abajo y pulsa «Conectar».</li>
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
      <div>
        <Button disabled={headers.trim().length === 0}>
          Conectar con YouTube Music
        </Button>
      </div>
    </section>
  );
}
