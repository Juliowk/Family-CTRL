import type { Categoria, Item, TipoPreco } from '../api/tipos';

/** Regras de cálculo e formatação da compra, compartilhadas pelas telas. */

const dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const dataCurta = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

export const formatarDinheiro = (valor: number) => dinheiro.format(valor);

export const formatarDecimal = (valor: number) => decimal.format(valor);

/** "2026-10-04" → "04/10/2026" (sem converter fuso: a data já é do usuário). */
export const formatarData = (iso: string) => dataCurta.format(new Date(`${iso}T00:00:00Z`));

/**
 * Lê um número digitado em pt-BR ("7,88", "1.250,5", "R$ 3,90"). Vazio ou inválido → undefined.
 */
export function lerDecimal(texto: string): number | undefined {
  const limpo = texto.replace(/[^\d,.-]/g, '').trim();
  if (!limpo) return undefined;
  // Com vírgula, o ponto é separador de milhar; sem vírgula, o ponto é o decimal
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : undefined;
}

/** Número para preencher um campo de texto em pt-BR (7.5 → "7,5"). */
export const paraCampo = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '' : String(valor).replace('.', ',');

/**
 * Subtotal = preço × quantidade (mesma regra do backend, em Valores.java).
 * Sem preço: undefined (valor descoberto no caixa). Por unidade sem quantidade: conta 1.
 * Por kg sem o peso: undefined.
 */
export function subtotal(
  tipo: TipoPreco,
  preco: number | null | undefined,
  quantidade: number | null | undefined,
): number | undefined {
  if (preco === null || preco === undefined) return undefined;
  const qtd = quantidade ?? (tipo === 'UNIDADE' ? 1 : undefined);
  if (qtd === undefined) return undefined;
  // Em inteiros (centavos × milésimos) para não sofrer com o arredondamento do ponto flutuante:
  // 6,90 × 1,255 tem de dar 8,66, como no BigDecimal do backend
  const centavos = Math.round(preco * 100);
  const milesimos = Math.round(qtd * 1000);
  return Math.round((centavos * milesimos) / 1000) / 100;
}

/** Total parcial da compra em andamento e quantos itens pegos ainda não têm valor. */
export function totalDaCompra(itens: Item[]) {
  let total = 0;
  let semValor = 0;
  for (const item of itens) {
    if (!item.pego) continue;
    const valor = subtotal(item.tipoPreco, item.preco, item.quantidadePega);
    if (valor === undefined) semValor += 1;
    else total += valor;
  }
  return { total: Math.round(total * 100) / 100, semValor };
}

/**
 * Sugestão para o formulário de pegar a partir da quantidade planejada ("2 kg" → 2 e KG;
 * "6 un" → 6 e UNIDADE). Texto sem número → nada.
 */
export function sugestaoDaQuantidade(planejada: string | null): {
  quantidade?: number;
  tipo?: TipoPreco;
} {
  if (!planejada) return {};
  const numero = planejada.match(/\d+(?:[.,]\d+)?/);
  const tipo: TipoPreco | undefined = /\bkg\b|quilo/i.test(planejada) ? 'KG' : undefined;
  return { quantidade: numero ? lerDecimal(numero[0]) : undefined, tipo };
}

export interface Grupo {
  categoria: Categoria;
  itens: Item[];
}

/**
 * Agrupa os itens pelas categorias (na ordem configurada), omitindo categorias vazias.
 * - planejar: na ordem em que foram adicionados.
 * - comprar: pendentes primeiro; os pegos vão para o fim da categoria, na ordem em que foram pegos.
 */
export function agruparPorCategoria(
  categorias: Categoria[],
  itens: Item[],
  modo: 'planejar' | 'comprar',
): Grupo[] {
  const ordenarAdicao = (a: Item, b: Item) => a.criadoEm.localeCompare(b.criadoEm) || a.id - b.id;
  const ordenar =
    modo === 'planejar'
      ? ordenarAdicao
      : (a: Item, b: Item) =>
          Number(a.pego) - Number(b.pego) ||
          (a.pego && b.pego ? (a.pegoEm ?? '').localeCompare(b.pegoEm ?? '') : 0) ||
          ordenarAdicao(a, b);
  const ids = new Set(categorias.map((c) => c.id));
  // Item de uma categoria que não está na lista (não deveria acontecer) vai para a fixa
  const fixa = categorias.find((c) => c.fixa);
  return categorias
    .map((categoria) => ({
      categoria,
      itens: itens
        .filter(
          (item) =>
            item.categoriaId === categoria.id || (categoria === fixa && !ids.has(item.categoriaId)),
        )
        .sort(ordenar),
    }))
    .filter((grupo) => grupo.itens.length > 0);
}

/** Mês atual do usuário no formato AAAA-MM. */
export function mesAtual(agora = new Date()): string {
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

/** Data de hoje do usuário no formato AAAA-MM-DD. */
export function hoje(agora = new Date()): string {
  return `${mesAtual(agora)}-${String(agora.getDate()).padStart(2, '0')}`;
}
