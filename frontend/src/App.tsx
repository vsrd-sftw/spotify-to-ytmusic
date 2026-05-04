import { useQuery } from '@tanstack/react-query'

function App() {
  const { data } = useQuery({
    queryKey: ['ping'],
    queryFn: () => Promise.resolve({ ok: true }),
  })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Spotify → YT Music</h1>
      <p data-testid="ping-status">{data?.ok ? 'ok' : '...'}</p>
    </main>
  )
}

export default App
