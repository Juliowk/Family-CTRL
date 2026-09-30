import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { definirAoNaoAutorizado } from '../api/cliente';
import { authApi } from '../api/endpoints';
import type { TokenResponse, Usuario } from '../api/tipos';
import { lerToken, limparToken, salvarToken } from '../api/token';
import { esquecerFamiliaAtual } from './familiaAtual';

interface AuthContexto {
  /** Há um token salvo (o usuário está, em princípio, logado). */
  autenticado: boolean;
  usuario: Usuario | undefined;
  carregandoUsuario: boolean;
  erroUsuario: unknown;
  recarregarUsuario: () => void;
  entrar: (resposta: TokenResponse) => void;
  sair: () => void;
}

const Contexto = createContext<AuthContexto | null>(null);

const CHAVE_ME = ['me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(lerToken);

  const me = useQuery({
    queryKey: CHAVE_ME,
    queryFn: authApi.me,
    enabled: token !== null,
    staleTime: Infinity,
  });

  // Quando qualquer chamada recebe 401, o cliente HTTP já limpou o token; aqui atualizamos a tela
  useEffect(() => {
    definirAoNaoAutorizado(() => {
      setToken(null);
      queryClient.clear();
    });
  }, [queryClient]);

  const entrar = useCallback(
    (resposta: TokenResponse) => {
      salvarToken(resposta.token);
      queryClient.setQueryData(CHAVE_ME, resposta.usuario);
      setToken(resposta.token);
    },
    [queryClient],
  );

  const sair = useCallback(() => {
    limparToken();
    esquecerFamiliaAtual();
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const { refetch } = me;
  const recarregarUsuario = useCallback(() => void refetch(), [refetch]);

  const valor = useMemo<AuthContexto>(
    () => ({
      autenticado: token !== null,
      usuario: me.data,
      carregandoUsuario: token !== null && me.isPending,
      erroUsuario: me.error,
      recarregarUsuario,
      entrar,
      sair,
    }),
    [token, me.data, me.isPending, me.error, recarregarUsuario, entrar, sair],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContexto {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return contexto;
}
