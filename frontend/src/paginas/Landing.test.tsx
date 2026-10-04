import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { criarApiFalsa } from '../test/apiFalsa';
import { renderizarApp } from '../test/renderizar';

describe('landing: compartilhar', () => {
  it('mostra o link atual com QR code e copia o link', async () => {
    criarApiFalsa();
    const { usuario } = renderizarApp('/');
    const url = `${window.location.origin}${window.location.pathname}`;

    expect(
      await screen.findByRole('heading', { name: /mande o family ctrl/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(url)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `QR code com o link ${url}` })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Copiar link' }));

    expect(await screen.findByRole('button', { name: 'Link copiado!' })).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(url);
  });
});
