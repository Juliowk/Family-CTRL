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
  quantidadePlanejada?: string;
}

/** Valores informados ao pegar um item (todos opcionais). */
export interface DadosPego {
  quantidadePega?: number;
  tipoPreco: TipoPreco;
  preco?: number;
  marca?: string;
}

export const itensApi = {
  adicionar: (listaId: number, dados: DadosItem) =>
    api<Item>(`/api/listas/${listaId}/itens`, { method: 'POST', body: dados }),
  /** Para apagar a quantidade desejada, envie string vazia. */
  atualizar: (id: number, dados: Partial<DadosItem>) =>
    api<Item>(`/api/itens/${id}`, { method: 'PATCH', body: dados }),
  remover: (id: number) => api<void>(`/api/itens/${id}`, { method: 'DELETE' }),
  pegar: (id: number, dados: DadosPego) =>
    api<Item>(`/api/itens/${id}/pego`, { method: 'PUT', body: dados }),
  desmarcar: (id: number) => api<Item>(`/api/itens/${id}/pego`, { method: 'DELETE' }),
  adicionarExtra: (listaId: number, dados: DadosPego & { nome: string; categoriaId: number }) =>
    api<Item>(`/api/listas/${listaId}/itens/extra`, { method: 'POST', body: dados }),
  desmarcarTodos: (listaId: number) =>
    api<void>(`/api/listas/${listaId}/desmarcar-todos`, { method: 'POST' }),
};

export interface DadosFinalizar {
  mercado: string;
  /** AAAA-MM-DD */
  dataCompra: string;
  valorVariavel: number;
  extrasMantidos: number[];
}

export const comprasApi = {
  finalizar: (listaId: number, dados: DadosFinalizar) =>
    api<CompraDetalhe>(`/api/listas/${listaId}/compras`, { method: 'POST', body: dados }),
  listar: (familiaId: number) => api<CompraResumo[]>(`/api/familias/${familiaId}/compras`),
  detalhar: (id: number) => api<CompraDetalhe>(`/api/compras/${id}`),
  resumo: (familiaId: number, mes: string) =>
    api<ResumoMes>(`/api/familias/${familiaId}/compras/resumo?mes=${mes}`),
};
