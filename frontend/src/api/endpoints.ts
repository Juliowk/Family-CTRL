import { api } from './cliente';
import type {
  Categoria,
  CompraDetalhe,
  CompraResumo,
  FamiliaDetalhe,
  FamiliaResumo,
  Item,
  Lista,
  ListaDetalhe,
  Papel,
  ResumoMes,
  TipoPreco,
  TokenResponse,
  Usuario,
  SugestaoItem,
} from './tipos';

/** Uma função por endpoint da API. */

export const authApi = {
  cadastrar: (dados: { nome: string; email: string; senha: string; confirmacaoSenha: string }) =>
    api<TokenResponse>('/api/auth/cadastro', { method: 'POST', body: dados }),
  login: (dados: { email: string; senha: string; lembrarDeMim: boolean }) =>
    api<TokenResponse>('/api/auth/login', { method: 'POST', body: dados }),
  me: () => api<Usuario>('/api/auth/me'),
};

export const familiasApi = {
  listar: () => api<FamiliaResumo[]>('/api/familias'),
  criar: (nome: string) => api<FamiliaResumo>('/api/familias', { method: 'POST', body: { nome } }),
  entrar: (codigo: string) =>
    api<FamiliaResumo>('/api/familias/entrar', { method: 'POST', body: { codigo } }),
  detalhar: (id: number) => api<FamiliaDetalhe>(`/api/familias/${id}`),
  renomear: (id: number, nome: string) =>
    api<FamiliaDetalhe>(`/api/familias/${id}`, { method: 'PATCH', body: { nome } }),
  novoConvite: (id: number) =>
    api<FamiliaDetalhe>(`/api/familias/${id}/convite`, { method: 'POST' }),
  alterarPapel: (id: number, usuarioId: number, papel: Papel) =>
    api<FamiliaDetalhe>(`/api/familias/${id}/membros/${usuarioId}`, {
      method: 'PATCH',
      body: { papel },
    }),
  removerMembro: (id: number, usuarioId: number) =>
    api<void>(`/api/familias/${id}/membros/${usuarioId}`, { method: 'DELETE' }),
  sair: (id: number) => api<void>(`/api/familias/${id}/sair`, { method: 'POST' }),
};

export const listasApi = {
  listar: (familiaId: number) => api<Lista[]>(`/api/familias/${familiaId}/listas`),
  criar: (familiaId: number, nome: string) =>
    api<Lista>(`/api/familias/${familiaId}/listas`, { method: 'POST', body: { nome } }),
  /** Cria a lista já com os itens (importação de CSV). */
  importar: (familiaId: number, dados: { nome: string; itens: DadosItem[] }) =>
    api<Lista>(`/api/familias/${familiaId}/listas/importar`, { method: 'POST', body: dados }),
  detalhar: (id: number) => api<ListaDetalhe>(`/api/listas/${id}`),
  renomear: (id: number, nome: string) =>
    api<Lista>(`/api/listas/${id}`, { method: 'PATCH', body: { nome } }),
  excluir: (id: number) => api<void>(`/api/listas/${id}`, { method: 'DELETE' }),
};

export const categoriasApi = {
  listar: (familiaId: number) => api<Categoria[]>(`/api/familias/${familiaId}/categorias`),
  criar: (familiaId: number, nome: string) =>
    api<Categoria>(`/api/familias/${familiaId}/categorias`, { method: 'POST', body: { nome } }),
  renomear: (id: number, nome: string) =>
    api<Categoria>(`/api/categorias/${id}`, { method: 'PATCH', body: { nome } }),
  excluir: (id: number) => api<void>(`/api/categorias/${id}`, { method: 'DELETE' }),
  reordenar: (familiaId: number, ids: number[]) =>
    api<Categoria[]>(`/api/familias/${familiaId}/categorias/ordem`, {
      method: 'PUT',
      body: { ids },
    }),
};

/** Planejamento de um item. */
export interface DadosItem {
  nome: string;
  categoriaId: number;
  /** Na medida do item: unidades ou kg (ex.: 0,3 = 300 g). */
  quantidadePlanejada?: number;
  /** Por unidade ou por kg (obrigatória). */
  medida: TipoPreco;
}

/** Valores informados ao pegar um item (todos opcionais). */
export interface DadosPego {
  quantidadePega?: number;
  tipoPreco: TipoPreco;
  preco?: number;
  marca?: string;
}

/**
 * Itens. As alterações num item existente levam a versão do item que a tela mostra (e "desmarcar
 * todos", a versão da lista): se outra pessoa alterou antes, a API responde 409 e nada muda.
 */
export const itensApi = {
  adicionar: (listaId: number, dados: DadosItem) =>
    api<Item>(`/api/listas/${listaId}/itens`, { method: 'POST', body: dados }),
  atualizar: (id: number, versao: number, dados: Partial<DadosItem>) =>
    api<Item>(`/api/itens/${id}`, { method: 'PATCH', body: { ...dados, versao } }),
  remover: (id: number, versao: number) =>
    api<void>(`/api/itens/${id}?versao=${versao}`, { method: 'DELETE' }),
  pegar: (id: number, versao: number, dados: DadosPego) =>
    api<Item>(`/api/itens/${id}/pego`, { method: 'PUT', body: { ...dados, versao } }),
  desmarcar: (id: number, versao: number) =>
    api<Item>(`/api/itens/${id}/pego?versao=${versao}`, { method: 'DELETE' }),
  adicionarExtra: (listaId: number, dados: DadosPego & { nome: string; categoriaId: number }) =>
    api<Item>(`/api/listas/${listaId}/itens/extra`, { method: 'POST', body: dados }),
  desmarcarTodos: (listaId: number, versaoLista: number) =>
    api<void>(`/api/listas/${listaId}/desmarcar-todos?versao=${versaoLista}`, { method: 'POST' }),
};

export interface DadosFinalizar {
  /** Valor final pago (do cupom). A diferença para a soma dos itens fica registrada na compra. */
  valorTotal: number;
  mercado?: string;
  /** AAAA-MM-DD */
  dataCompra: string;
  extrasMantidos: number[];
  /** Versão da lista conferida na tela: se outra pessoa alterou depois, a API responde 409. */
  versaoLista: number;
}

/** Categoria e medida sugeridas pelo nome do produto (histórico da família, dicionário ou IA). */
export const sugestoesApi = {
  item: (familiaId: number, nome: string) =>
    api<SugestaoItem>(`/api/familias/${familiaId}/sugestao-item?nome=${encodeURIComponent(nome)}`),
};

export const comprasApi = {
  finalizar: (listaId: number, dados: DadosFinalizar) =>
    api<CompraDetalhe>(`/api/listas/${listaId}/compras`, { method: 'POST', body: dados }),
  listar: (familiaId: number) => api<CompraResumo[]>(`/api/familias/${familiaId}/compras`),
  detalhar: (id: number) => api<CompraDetalhe>(`/api/compras/${id}`),
  resumo: (familiaId: number, mes: string) =>
    api<ResumoMes>(`/api/familias/${familiaId}/compras/resumo?mes=${mes}`),
};
