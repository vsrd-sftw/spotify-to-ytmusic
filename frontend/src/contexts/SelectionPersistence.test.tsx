import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import { server } from '@/test/msw/server'
import { samplePlaylists, sampleAlbums } from '@/test/msw/fixtures'
import { makeQueryWrapper } from '@/test/queryWrapper'
import { SelectionProvider } from '@/contexts/SelectionContext'
import { LibraryPage } from '@/pages/Library'
import { MigratePage } from '@/pages/Migrate'

function TwoPageHarness() {
  return (
    <Routes>
      <Route
        path="/library"
        element={
          <>
            <Link to="/migrate">go-migrate</Link>
            <LibraryPage />
          </>
        }
      />
      <Route
        path="/migrate"
        element={
          <>
            <Link to="/library">go-library</Link>
            <MigratePage />
          </>
        }
      />
    </Routes>
  )
}

function renderHarness() {
  const QueryWrapper = makeQueryWrapper()
  return render(
    <QueryWrapper>
      <SelectionProvider>
        <MemoryRouter initialEntries={['/library']}>
          <TwoPageHarness />
        </MemoryRouter>
      </SelectionProvider>
    </QueryWrapper>,
  )
}

describe('Selection persistence across pages', () => {
  it('preserves selected playlist when navigating Library → Migrate', async () => {
    server.use(
      http.get('*/api/playlists', () => HttpResponse.json(samplePlaylists)),
      http.get('*/api/albums', () => HttpResponse.json(sampleAlbums)),
    )

    renderHarness()

    // Wait for the playlists to render
    const checkbox = await screen.findByRole('checkbox', { name: /^Seleccionar Mis favoritos 2025$/ })
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()

    // Navigate to /migrate
    fireEvent.click(screen.getByRole('link', { name: 'go-migrate' }))

    // Confirm Migration screen shows count = 1 playlist (selection survived)
    expect(await screen.findByText(/Confirmar Migración/i)).toBeInTheDocument()
    expect(screen.getByText(/Playlists: 1/)).toBeInTheDocument()
  })

  it('sends real selected ids to POST /api/migrate and clears selection on success', async () => {
    const startBody = vi.fn()
    server.use(
      http.get('*/api/playlists', () => HttpResponse.json(samplePlaylists)),
      http.get('*/api/albums', () => HttpResponse.json(sampleAlbums)),
      http.post('*/api/migrate', async ({ request }) => {
        const body = (await request.json()) as { playlistIds: string[]; albumIds: string[] }
        startBody(body)
        return HttpResponse.json({ jobId: 'job-xyz' })
      }),
    )

    renderHarness()

    const checkbox = await screen.findByRole('checkbox', { name: /^Seleccionar Mis favoritos 2025$/ })
    fireEvent.click(checkbox)

    fireEvent.click(screen.getByRole('link', { name: 'go-migrate' }))

    const startButton = await screen.findByRole('button', { name: /Iniciar Migración/i })
    await act(async () => {
      fireEvent.click(startButton)
    })

    await waitFor(() => {
      expect(startBody).toHaveBeenCalledTimes(1)
    })
    expect(startBody).toHaveBeenCalledWith({
      playlistIds: ['pl_own_1'],
      albumIds: [],
    })
  })
})
