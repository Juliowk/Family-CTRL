/** Tipos das respostas da API (espelham os DTOs do backend). */

export interface Usuario {
  id: number;
  nome: string;
  email: string;
}

export interface TokenResponse {
  token: string;
  expiraEm: string;
  usuario: Usuario;
}

export type Papel = 'ADMIN' | 'MEMBRO';

export interface FamiliaResumo {
  id: number;
  nome: string;
  meuPapel: Papel;
  totalMembros: number;
}

export interface Membro {
  usuarioId: number;
  nome: string;
  email: string;
  papel: Papel;
  entrouEm: string;
}

export interface FamiliaDetalhe {
  id: number;
  nome: string;
  codigoConvite: string;
  meuPapel: Papel;
  criadoEm: string;
  membros: Membro[];
}

export interface Categoria {
  id: number;
  nome: string;
  ordem: number;
  /** A categoria "Outros": não pode ser excluída nem renomeada. */
  fixa: boolean;
}

export interface Lista {
  id: number;
  familiaId: number;
  nome: string;
  criadaEm: string;
  totalItens: number;
  /** > 0 indica uma compra em andamento. */
  itensPegos: number;
}

export interface Pessoa {
  id: number;
  nome: string | null;
}

/** UNIDADE: preço de uma unidade × quantidade. KG: peso em kg + preço total pago por ele. */
export type TipoPreco = 'UNIDADE' | 'KG';

/** Item: planejamento (nome, categoria, quantidade desejada) + estado da compra em andamento. */
export interface Item {
  id: number;
  listaId: number;
  categoriaId: number;
  nome: string;
  /** Quantidade desejada, na medida do item (unidades ou kg). */
  quantidadePlanejada: number | null;
  /** Medida planejada: o "preço por" começa nela ao pegar o item. */
  medida: TipoPreco;
  pego: boolean;
  pegoEm: string | null;
  pegoPor: Pessoa | null;
  quantidadePega: number | null;
  tipoPreco: TipoPreco;
  preco: number | null;
  /** Nulo se não foi pego ou não tem preço (valor descoberto no caixa). */
  subtotal: number | null;
  marca: string | null;
  /** Não planejado: adicionado durante a compra. */
  extra: boolean;
  adicionadoPor: Pessoa;
  criadoEm: string;
  atualizadoEm: string;
  /** Sobe a cada alteração. Quem altera envia a versão que está vendo (409 se outra pessoa mudou antes). */
  versao: number;
}

export interface ListaDetalhe {
  id: number;
  familiaId: number;
  nome: string;
  criadaEm: string;
  /** Sobe a cada alteração em qualquer item. Finalizar e "desmarcar todos" enviam a versão vista. */
  versao: number;
  categorias: Categoria[];
  itens: Item[];
}

export interface CompraResumo {
  id: number;
  listaId: number | null;
  listaNome: string;
  /** Opcional ao finalizar. */
  mercado: string | null;
  /** AAAA-MM-DD */
  dataCompra: string;
  valorItens: number;
  /** Valor pago menos a soma dos itens com preço. Negativo: desconto; positivo: itens sem preço ou acréscimo. */
  valorVariavel: number;
  valorTotal: number;
  totalItens: number;
  itensPegos: number;
  /** Compra da lista "Exemplo Visual": fica fora do resumo do mês. */
  exemplo: boolean;
}

export interface CompraItem {
  id: number;
  nome: string;
  categoria: string;
  categoriaOrdem: number;
  quantidadePlanejada: string | null;
  pego: boolean;
  quantidadePega: number | null;
  tipoPreco: TipoPreco;
  preco: number | null;
  subtotal: number | null;
  marca: string | null;
  extra: boolean;
}

export interface CompraDetalhe extends CompraResumo {
  familiaId: number;
  finalizadaPor: string | null;
  finalizadaEm: string;
  itens: CompraItem[];
}

/**
 * Categoria e medida sugeridas pelo nome do produto. PADRAO: nada encontrado ("Outros", por
 * unidade); a tela não aplica esse caso.
 */
export interface SugestaoItem {
  categoriaId: number;
  medida: TipoPreco;
  origem: 'HISTORICO' | 'DICIONARIO' | 'IA' | 'PADRAO';
}

export interface ResumoMes {
  /** AAAA-MM */
  mes: string;
  gasto: number;
  compras: number;
  ultimaCompra: CompraResumo | null;
}
