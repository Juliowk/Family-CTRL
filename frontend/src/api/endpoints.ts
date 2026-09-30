import { api } from './cliente';
import type {
  FamiliaDetalhe,
  FamiliaResumo,
  Item,
  Lista,
  ListaDetalhe,
  Papel,
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
  listar: (familiaId: number, arquivadas = false) =>
    api<Lista[]>(`/api/familias/${familiaId}/listas?arquivadas=${arquivadas}`),
  criar: (familiaId: number, nome: string) =>
    api<Lista>(`/api/familias/${familiaId}/listas`, { method: 'POST', body: { nome } }),
  detalhar: (id: number) => api<ListaDetalhe>(`/api/listas/${id}`),
  atualizar: (id: number, dados: { nome?: string; arquivada?: boolean }) =>
    api<Lista>(`/api/listas/${id}`, { method: 'PATCH', body: dados }),
  excluir: (id: number) => api<void>(`/api/listas/${id}`, { method: 'DELETE' }),
};

export interface DadosItem {
  nome: string;
  quantidade?: string;
  observacao?: string;
}

export const itensApi = {
  adicionar: (listaId: number, dados: DadosItem) =>
    api<Item>(`/api/listas/${listaId}/itens`, { method: 'POST', body: dados }),
  atualizar: (id: number, dados: Partial<DadosItem> & { comprado?: boolean }) =>
    api<Item>(`/api/itens/${id}`, { method: 'PATCH', body: dados }),
  remover: (id: number) => api<void>(`/api/itens/${id}`, { method: 'DELETE' }),
  limparComprados: (listaId: number) =>
    api<void>(`/api/listas/${listaId}/itens/comprados`, { method: 'DELETE' }),
};
