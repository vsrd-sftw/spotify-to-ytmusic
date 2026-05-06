import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeQueryWrapper } from '@/test/queryWrapper';
import { ReportsList } from './List';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { sampleReport } from '@/test/msw/fixtures';

describe('ReportsList', () => {
  it('shows skeleton while loading', () => {
    render(<ReportsList />, { wrapper: makeQueryWrapper() });
    expect(screen.getAllByTestId('skeleton')).toHaveLength(6);
  });

  it('shows error state on fetch failure', async () => {
    server.use(
      http.get('*/api/reports', () =>
        HttpResponse.json({ message: 'Error' }, { status: 500 }),
      ),
    );

    render(<ReportsList />, { wrapper: makeQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Error al cargar reportes')).toBeInTheDocument();
    });
  });

  it('shows empty state when no reports', async () => {
    server.use(
      http.get('*/api/reports', () => HttpResponse.json([])),
    );

    render(<ReportsList />, { wrapper: makeQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Sin reportes')).toBeInTheDocument();
    });
  });

  it('shows report list with totals', async () => {
    render(<ReportsList />, { wrapper: makeQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Reporte/)).toBeInTheDocument();
    });

    expect(screen.getByText('1 playlist')).toBeInTheDocument();
    expect(screen.getByText('1 álbum')).toBeInTheDocument();
    expect(screen.getByText('2 no encontradas')).toBeInTheDocument();
  });

  it('calls onSelectReport when clicking a report', async () => {
    const onSelect = vi.fn();
    render(<ReportsList onSelectReport={onSelect} />, { wrapper: makeQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Reporte/)).toBeInTheDocument();
    });

    const button = screen.getByText(/Reporte/);
    button.click();
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: sampleReport.id,
    }));
  });
});
