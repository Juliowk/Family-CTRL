import type { Categoria, Item, TipoPreco } from '../api/tipos';

/** Regras de cálculo e formatação da compra, compartilhadas pelas telas. */

const dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const dataCurta = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

export const formatarDinheiro = (valor: number) => dinheiro.format(valor);

export const formatarDecimal = (valor: number) => decimal.format(valor);

/** "2026-10-04" → "04/10/2026" (sem converter fuso: a data já é do usuário). */
export const formatarData = (iso: string) => dataCurta.format(new Date(`${iso}T00:00:00Z`));

/** "04/10/2026 · Atacadão", ou só a data quando o mercado não foi informado. */
export const dataEMercado = (compra: { dataCompra: string; mercado: string | null }) =>
  [formatarData(compra.dataCompra), compra.mercado].filter(Boolean).join(' · ');

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

/** Arredonda para centavos (evita 41.519999 nas contas com ponto flutuante). */
export const centavos = (valor: number) => Math.round(valor * 100) / 100;

/** Valor em dinheiro para preencher um campo (41.5 → "41,50"). */
export const paraCampoDinheiro = (valor: number) => valor.toFixed(2).replace('.', ',');

/** Número para preencher um campo de texto em pt-BR (7.5 → "7,5"). */
export const paraCampo = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '' : String(valor).replace('.', ',');

/**
 * Subtotal de um item pego (mesma regra do backend, em Valores.java).
 * Sem preço: undefined (valor descoberto no caixa). Por kg: o preço já é o total pago pelo peso.
 * Por unidade: preço × quantidade; sem quantidade, conta 1.
 */
export function subtotal(
  tipo: TipoPreco,
  preco: number | null | undefined,
  quantidade: number | null | undefined,
): number | undefined {
  if (preco === null || preco === undefined) return undefined;
  if (tipo === 'KG') return Math.round(preco * 100) / 100;
  const qtd = quantidade ?? 1;
  // Em inteiros (centavos × milésimos) para não sofrer com o arredondamento do ponto flutuante:
  // 6,90 × 1,255 tem de dar 8,66, como no BigDecimal do backend
  const precoEmCentavos = Math.round(preco * 100);
  const milesimos = Math.round(qtd * 1000);
  return Math.round((precoEmCentavos * milesimos) / 1000) / 100;
}

/**
 * Detalhe de um item pego para as listas: "4 un · R$ 7,88/un · Pullman" (por unidade) ou
 * "1,25 kg · Marca" (por kg: o total pago já aparece ao lado, como subtotal).
 */
export function descreverPego(item: {
  tipoPreco: TipoPreco;
  quantidadePega: number | null;
  preco: number | null;
  marca: string | null;
}) {
  const partes: string[] = [];
  const porUnidade = item.tipoPreco === 'UNIDADE';
  if (item.quantidadePega !== null) {
    const qtd = formatarDecimal(item.quantidadePega);
    partes.push(`${qtd} ${porUnidade ? 'un' : 'kg'}`);
  }
  if (porUnidade && item.preco !== null) partes.push(`${formatarDinheiro(item.preco)}/un`);
  if (item.marca) partes.push(item.marca);
  return partes.join(' · ');
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
 * Sugestão para o formulário de pegar a partir da quantidade planejada: "6 un" → 6 por unidade;
 * "2 kg" → 2 kg; "500 g" → 0,5 kg. Texto sem número → nada.
 */
export function sugestaoDaQuantidade(planejada: string | null): {
  quantidade?: number;
  tipo?: TipoPreco;
} {
  if (!planejada) return {};
  const numero = planejada.match(/\d+(?:[.,]\d+)?/);
  const valor = numero ? lerDecimal(numero[0]) : undefined;
  if (/\d\s*(kg|quilos?)\b/i.test(planejada)) return { quantidade: valor, tipo: 'KG' };
  if (/\d\s*(g|gramas?)\b/i.test(planejada)) {
    return { quantidade: valor !== undefined ? valor / 1000 : undefined, tipo: 'KG' };
  }
  return { quantidade: valor, tipo: undefined };
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

/** Rótulo curto da medida planejada, para mostrar junto do item ("por kg"). */
export function rotuloMedida(medida: TipoPreco) {
  return medida === 'KG' ? 'por kg' : 'por unidade';
}
