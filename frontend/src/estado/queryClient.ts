import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/cliente';

/**
 * Tenta de novo só quando faz sentido: falha de conexão/timeout ou erro 5xx (típico do Heroku
 * enquanto o dyno acorda). Erros 4xx (validação, 404, 401) não melhoram com nova tentativa.
 */
export function deveTentarDeNovo(tentativas: number, erro: unknown): boolean {
  if (tentativas >= 2) return false;
  return erro instanceof ApiError && (erro.ehFalhaDeConexao || erro.status >= 500);
}

export function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: deveTentarDeNovo,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
