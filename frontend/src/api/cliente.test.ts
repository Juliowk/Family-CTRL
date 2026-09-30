import { describe, expect, it, vi } from 'vitest';
import { api, ApiError, definirAoNaoAutorizado } from './cliente';
import { deveTentarDeNovo } from '../estado/queryClient';
import { lerToken, salvarToken } from './token';

function respostaJson(status: number, corpo: unknown, tipo = 'application/json') {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': tipo } });
}

async function capturarErro(promessa: Promise<unknown>): Promise<ApiError> {
  try {
    await promessa;
  } catch (erro) {
    return erro as ApiError;
  }
  throw new Error('Era esperado um erro');
}

describe('cliente HTTP', () => {
  it('envia o token no header Authorization', async () => {
    salvarToken('meu-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson(200, { ok: 1 }));

    await api('/api/auth/me');

    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer meu-token');
  });

  it('converte ProblemDetail em ApiError com erros por campo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respostaJson(
        400,
        {
          status: 400,
          title: 'Dados inválidos',
          detail: 'Verifique os campos informados.',
          erros: [{ campo: 'email', mensagem: 'E-mail inválido.' }],
        },
        'application/problem+json',
      ),
    );

    const erro = await capturarErro(api('/api/auth/cadastro', { method: 'POST', body: {} }));

    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.status).toBe(400);
    expect(erro.message).toBe('Verifique os campos informados.');
    expect(erro.erroDoCampo('email')).toBe('E-mail inválido.');
  });

  it('em 401 com token, limpa o token e avisa o app', async () => {
    salvarToken('expirado');
    const aoNaoAutorizado = vi.fn();
    definirAoNaoAutorizado(aoNaoAutorizado);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson(401, { status: 401 }));

    await expect(api('/api/familias')).rejects.toBeInstanceOf(ApiError);

    expect(lerToken()).toBeNull();
    expect(aoNaoAutorizado).toHaveBeenCalledOnce();
  });

  it('falha de rede vira ApiError com status 0 e permite nova tentativa', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const erro = await capturarErro(api('/api/familias'));

    expect(erro.status).toBe(0);
    expect(deveTentarDeNovo(0, erro)).toBe(true);
    expect(deveTentarDeNovo(0, new ApiError(404, 'x'))).toBe(false);
  });

  it('204 retorna undefined', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api('/api/itens/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
