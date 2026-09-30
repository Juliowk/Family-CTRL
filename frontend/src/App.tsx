import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { HashRouter } from 'react-router';
import { AuthProvider } from './estado/auth';
import { criarQueryClient } from './estado/queryClient';
import { Rotas } from './Rotas';

/** Provedores globais: cache de dados (TanStack Query) e autenticação. */
export function Provedores({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [queryClient] = useState(() => client ?? criarQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * HashRouter: as rotas ficam depois do "#" (ex.: /Family-CTRL/#/login). O GitHub Pages só
 * serve arquivos estáticos e não sabe redirecionar /Family-CTRL/login para o index.html.
 */
export function App() {
  return (
    <Provedores>
      <HashRouter>
        <Rotas />
      </HashRouter>
    </Provedores>
  );
}
