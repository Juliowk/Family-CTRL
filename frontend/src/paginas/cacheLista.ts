import type { QueryClient } from '@tanstack/react-query';
import type { Item, ListaDetalhe } from '../api/tipos';
import { chaves } from '../estado/chaves';

/** Atualizações do cache da tela da lista, compartilhadas pelas abas. */

/** Substitui (ou acrescenta) um item no detalhe da lista em cache. */
export function gravarItem(queryClient: QueryClient, item: Item) {
  queryClient.setQueryData<ListaDetalhe>(chaves.lista(item.listaId), (atual) => {
    if (!atual) return atual;
    const existe = atual.itens.some((i) => i.id === item.id);
    return {
      ...atual,
      itens: existe
        ? atual.itens.map((i) => (i.id === item.id ? item : i))
        : [...atual.itens, item],
    };
  });
}

export function apagarItem(queryClient: QueryClient, listaId: number, itemId: number) {
  queryClient.setQueryData<ListaDetalhe>(chaves.lista(listaId), (atual) =>
    atual ? { ...atual, itens: atual.itens.filter((i) => i.id !== itemId) } : atual,
  );
}

/** Depois de alterar itens: os cards da tela da família (quantidade, "em andamento") mudam. */
export function invalidarResumoDasListas(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
}
