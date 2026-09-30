import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { salvarToken } from '../api/token';
import { Provedores } from '../App';
import { definirFamiliaAtual } from '../estado/familiaAtual';
import { Rotas } from '../Rotas';
import { TOKEN } from './apiFalsa';

interface Opcoes {
  logado?: boolean;
  familiaAtual?: number;
}

/** Renderiza o app inteiro numa rota, com um cache novo (sem retry, para os testes serem rápidos). */
export function renderizarApp(rota: string, { logado = false, familiaAtual }: Opcoes = {}) {
  if (logado) salvarToken(TOKEN);
  if (familiaAtual) definirFamiliaAtual(familiaAtual);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const usuario = userEvent.setup();
  const resultado = render(
    <Provedores client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <Rotas />
      </MemoryRouter>
    </Provedores>,
  );
  return { usuario, client, ...resultado };
}
