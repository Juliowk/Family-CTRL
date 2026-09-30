/**
 * Chaves do cache do TanStack Query. Centralizar evita erros de digitação e deixa claro o que
 * invalidar depois de cada alteração. Ex.: invalidar ['familias'] também invalida
 * ['familias', 3], porque a comparação é por prefixo.
 */
export const chaves = {
  familias: ['familias'] as const,
  familia: (id: number) => ['familias', id] as const,
  todasListas: ['listas'] as const,
  listas: (familiaId: number, arquivadas: boolean) => ['listas', familiaId, arquivadas] as const,
  lista: (id: number) => ['lista', id] as const,
};
