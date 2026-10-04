import { useIsMutating, useQuery } from '@tanstack/react-query';
import { listasApi } from '../api/endpoints';
import { chaves } from '../estado/chaves';

/**
 * De quanto em quanto tempo a tela da lista busca a versão mais recente no servidor. É isso que
 * mantém dois ou mais aparelhos fazendo a mesma compra mostrando os mesmos itens e valores.
 */
export const INTERVALO_SINCRONIA_MS = 3_000;

/**
 * Detalhe da lista, sempre sincronizado com o servidor: busca de novo a cada
 * {@link INTERVALO_SINCRONIA_MS} enquanto a tela está visível, ao voltar para o app e ao
 * reconectar. Enquanto uma alteração está em andamento a busca pausa, para uma resposta antiga
 * não sobrescrever o que acabou de ser alterado (ela volta assim que a alteração termina).
 */
export function useLista(listaId: number) {
  // Re-renderiza quando uma alteração começa ou termina, ligando/desligando a busca periódica
  const alterando = useIsMutating() > 0;
  return useQuery({
    queryKey: chaves.lista(listaId),
    queryFn: () => listasApi.detalhar(listaId),
    enabled: Number.isFinite(listaId),
    staleTime: 0,
    refetchInterval: alterando ? false : INTERVALO_SINCRONIA_MS,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
}
