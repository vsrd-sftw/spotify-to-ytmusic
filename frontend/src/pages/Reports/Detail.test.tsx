import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { ReportDetail } from './Detail';
import { sampleReport } from '@/test/msw/fixtures';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

describe('ReportDetail', () => {
  const renderDetail = (props: { onClose: () => void; onDownload?: () => void }) => {
    return render(<ReportDetail report={sampleReport} {...props} />, {
      wrapper: makeQueryWrapper(),
    });
  };

  it('shows loading skeleton initially', () => {
    renderDetail({ onClose: vi.fn() });
    expect(screen.getAllByTestId('skeleton')).toHaveLength(9);
  });

  it('renders playlists section', async () => {
    renderDetail({ onClose: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Playlists/)).toBeInTheDocument();
    });

    expect(screen.getByText('40/42 encontradas')).toBeInTheDocument();
  });

  it('renders albums section', async () => {
    renderDetail({ onClose: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText(/Álbumes/)).toBeInTheDocument();
    });

    expect(screen.getByText('Radiohead - In Rainbows')).toBeInTheDocument();
    expect(screen.getByText('saved')).toBeInTheDocument();
  });

  it('renders not found section', async () => {
    renderDetail({ onClose: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText(/No encontrados/)).toBeInTheDocument();
    });

    expect(screen.getByText('Artista oscuro - Pista rara')).toBeInTheDocument();
    expect(screen.getByText('Otro - Pista')).toBeInTheDocument();
  });

  it('calls onClose when clicking Cerrar', async () => {
    const onClose = vi.fn();
    renderDetail({ onClose });

    await waitFor(() => {
      expect(screen.getByText('Cerrar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cerrar'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows download button when onDownload is provided', async () => {
    const onDownload = vi.fn();
    renderDetail({ onClose: vi.fn(), onDownload });

    await waitFor(() => {
      expect(screen.getByText('Descargar JSON')).toBeInTheDocument();
    });
  });

  it('does not show download button when onDownload is not provided', async () => {
    renderDetail({ onClose: vi.fn() });

    await waitFor(() => {
      expect(screen.queryByText('Descargar JSON')).not.toBeInTheDocument();
    });
  });

  it('calls onDownload with report when clicking Descargar JSON', async () => {
    const onDownload = vi.fn();
    renderDetail({ onClose: vi.fn(), onDownload });

    await waitFor(() => {
      expect(screen.getByText('Descargar JSON')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Descargar JSON'));
    expect(onDownload).toHaveBeenCalledWith(
      expect.objectContaining({ id: sampleReport.id }),
    );
  });

  it('shows error state on fetch failure', async () => {
    server.use(
      http.get('*/api/reports/:id', () =>
        HttpResponse.json({ message: 'Error' }, { status: 500 }),
      ),
    );

    renderDetail({ onClose: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText('Error al cargar el detalle')).toBeInTheDocument();
    });
  });

  it('shows empty messages when sections are empty', async () => {
    const emptyReport = { id: 'empty', playlists: [], albums: [], notFound: [] };
    server.use(
      http.get('*/api/reports/:id', () => HttpResponse.json(emptyReport)),
    );

    renderDetail({ onClose: vi.fn() });

    await waitFor(() => {
      expect(screen.getByText('No se migraron playlists.')).toBeInTheDocument();
    });
    expect(screen.getByText('No se migraron álbumes.')).toBeInTheDocument();
    expect(screen.getByText('Todos los items fueron encontrados.')).toBeInTheDocument();
  });
});
