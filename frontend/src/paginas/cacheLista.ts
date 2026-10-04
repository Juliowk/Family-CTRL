import type { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/cliente';
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

/**
 * Antes de alterar: cancela uma busca da lista em andamento, para a resposta dela (anterior à
 * alteração) não chegar depois e desfazer na tela o que acabou de ser alterado.
 */
export function antesDeAlterar(queryClient: QueryClient, listaId: number) {
  return queryClient.cancelQueries({ queryKey: chaves.lista(listaId) });
}

/**
 * Depois de alterar: busca a lista de novo (traz a versão nova da lista e o que outras pessoas
 * mudaram) e atualiza os cards da tela da família (quantidade, "em andamento").
 */
export function depoisDeAlterar(queryClient: QueryClient, listaId: number) {
  void queryClient.invalidateQueries({ queryKey: chaves.lista(listaId) });
  void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
}

/**
 * 409 (outra pessoa alterou antes) ou 404 (outra pessoa removeu): a tela mostrava dados
 * desatualizados e nada foi gravado.
 */
export function ehDesatualizado(erro: unknown): erro is ApiError {
  return erro instanceof ApiError && (erro.status === 409 || erro.status === 404);
}

/** Mensagem para quando a alteração foi recusada por dados desatualizados. */
export function mensagemDesatualizado(erro: ApiError): string {
  return erro.status === 404
    ? 'Este item foi removido por outra pessoa. A lista foi atualizada.'
    : erro.message;
}
