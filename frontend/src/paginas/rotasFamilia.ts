/**
 * Funcionalidades da tela inicial da família. A aberta fica na URL (?ctrl=listas), na mesma página:
 * trocar de funcionalidade não recarrega nem muda de rota, e voltar de uma lista reabre a seção.
 */
export type Funcionalidade = 'listas';

export const PARAMETRO_FUNCIONALIDADE = 'ctrl';

/** Tela da família com a funcionalidade de listas aberta (opcionalmente nas compras concluídas). */
export function rotaListas(familiaId: number, concluidas = false) {
  return `/familias/${familiaId}?${PARAMETRO_FUNCIONALIDADE}=listas${concluidas ? '&ver=concluidas' : ''}`;
}
