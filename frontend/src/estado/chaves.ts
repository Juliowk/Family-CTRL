/**
 * Chaves do cache do TanStack Query. Centralizar evita erros de digitação e deixa claro o que
 * invalidar depois de cada alteração. Ex.: invalidar ['familias'] também invalida
 * ['familias', 3], porque a comparação é por prefixo.
 */
export const chaves = {
  familias: ['familias'] as const,
  familia: (id: number) => ['familias', id] as const,
  todasListas: ['listas'] as const,
  listas: (familiaId: number) => ['listas', familiaId] as const,
  lista: (id: number) => ['lista', id] as const,
  categorias: (familiaId: number) => ['categorias', familiaId] as const,
  /** Prefixo de tudo que depende das compras concluídas (lista, detalhe e resumo do mês). */
  todasCompras: ['compras'] as const,
  compras: (familiaId: number) => ['compras', 'familia', familiaId] as const,
  compra: (id: number) => ['compras', 'detalhe', id] as const,
  resumo: (familiaId: number, mes: string) => ['compras', 'resumo', familiaId, mes] as const,
};
