import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { YTMusicConnect } from './YTMusic';

describe('YTMusicConnect', () => {
  it('renders the section heading', () => {
    render(<YTMusicConnect />);
    expect(screen.getByRole('heading', { name: /conectar youtube music/i })).toBeInTheDocument();
  });

  it('renders a labelled textarea', () => {
    render(<YTMusicConnect />);
    expect(screen.getByLabelText(/headers del navegador/i)).toBeInTheDocument();
  });

  it('renders the connect button', () => {
    render(<YTMusicConnect />);
    expect(screen.getByRole('button', { name: /conectar con youtube music/i })).toBeInTheDocument();
  });

  it('button is disabled when textarea is empty', () => {
    render(<YTMusicConnect />);
    expect(screen.getByRole('button', { name: /conectar con youtube music/i })).toBeDisabled();
  });

  it('button is enabled when textarea has content', () => {
    render(<YTMusicConnect />);
    fireEvent.change(screen.getByLabelText(/headers del navegador/i), {
      target: { value: 'Authorization: Bearer token' },
    });
    expect(screen.getByRole('button', { name: /conectar con youtube music/i })).toBeEnabled();
  });

  it('help text references DevTools and Network', () => {
    render(<YTMusicConnect />);
    const section = screen.getByRole('region', { name: /conectar youtube music/i });
    expect(section).toHaveTextContent(/devtools/i);
    expect(section).toHaveTextContent(/network/i);
  });
});
