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

export interface Lista {
  id: number;
  familiaId: number;
  nome: string;
  arquivada: boolean;
  criadaEm: string;
  totalItens: number;
  itensComprados: number;
}

export interface Pessoa {
  id: number;
  nome: string | null;
}

export interface Item {
  id: number;
  listaId: number;
  nome: string;
  quantidade: string | null;
  observacao: string | null;
  comprado: boolean;
  compradoPor: Pessoa | null;
  adicionadoPor: Pessoa;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ListaDetalhe {
  id: number;
  familiaId: number;
  nome: string;
  arquivada: boolean;
  criadaEm: string;
  itens: Item[];
}
