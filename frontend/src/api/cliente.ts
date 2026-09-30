import { lerToken, limparToken } from './token';

/**
 * Cliente HTTP único do app: todas as chamadas à API passam por aqui.
 *
 * - Usa a URL base de VITE_API_URL.
 * - Envia o JWT no header Authorization.
 * - Converte respostas de erro (ProblemDetail, RFC 9457) em ApiError.
 * - Em 401 com token, limpa o token e avisa o app (que redireciona para o login).
 * - Aplica timeout: o servidor no Heroku pode estar "dormindo" e demorar para responder.
 */

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

/** Tempo máximo de uma requisição. Generoso porque o dyno do Heroku leva alguns segundos para acordar. */
const TIMEOUT_MS = 30_000;

export interface ErroCampo {
  campo: string;
  mensagem: string;
}

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  erros?: ErroCampo[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly erros: ErroCampo[];

  constructor(status: number, mensagem: string, erros: ErroCampo[] = []) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.erros = erros;
  }

  /** Erro de rede ou timeout (status 0): vale a pena tentar de novo. */
  get ehFalhaDeConexao(): boolean {
    return this.status === 0;
  }

  /** Mensagem de erro de um campo específico, se houver. */
  erroDoCampo(campo: string): string | undefined {
    return this.erros.find((e) => e.campo === campo)?.mensagem;
  }
}

type AoNaoAutorizado = () => void;
let aoNaoAutorizado: AoNaoAutorizado = () => {};

/** O app registra aqui o que fazer quando a sessão expira (ex.: ir para o login). */
export function definirAoNaoAutorizado(callback: AoNaoAutorizado): void {
  aoNaoAutorizado = callback;
}

interface Opcoes {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function api<T>(caminho: string, { method = 'GET', body }: Opcoes = {}): Promise<T> {
  const token = lerToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
  } finally {
    clearTimeout(timeout);
  }

  if (resposta.status === 401 && token) {
    limparToken();
    aoNaoAutorizado();
  }

  if (!resposta.ok) {
    const problema = await lerJson<ProblemDetail>(resposta);
    throw new ApiError(
      resposta.status,
      problema?.detail ?? problema?.title ?? mensagemPadrao(resposta.status),
      problema?.erros ?? [],
    );
  }

  if (resposta.status === 204) return undefined as T;
  return (await lerJson<T>(resposta)) as T;
}

async function lerJson<T>(resposta: Response): Promise<T | null> {
  try {
    return (await resposta.json()) as T;
  } catch {
    return null;
  }
}

function mensagemPadrao(status: number): string {
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para esta ação.';
  if (status === 404) return 'Não encontrado.';
  if (status >= 500) return 'O servidor encontrou um erro. Tente novamente.';
  return 'Não foi possível concluir a operação.';
}

/**
 * "Acorda" o servidor do Heroku sem esperar a resposta, para que ele já esteja de pé
 * quando o usuário fizer login.
 */
export function aquecerServidor(): void {
  fetch(`${API_URL}/actuator/health`).catch(() => {});
}
