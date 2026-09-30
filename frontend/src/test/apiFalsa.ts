import { vi } from 'vitest';
import type { FamiliaDetalhe, Item, Lista, Usuario } from '../api/tipos';

/**
 * API simulada em memória para os testes. Intercepta o fetch global e responde como o backend
 * responderia, para testar os fluxos das telas sem servidor.
 */

export const SENHA_CORRETA = 'senha-segura';
export const TOKEN = 'token-de-teste';

export interface Chamada {
  metodo: string;
  caminho: string;
  corpo: unknown;
}

interface Estado {
  usuario: Usuario;
  familia: FamiliaDetalhe;
  listas: Lista[];
  itens: Item[];
  /** Força erro 500 em PATCH /api/itens/{id} (para testar o rollback otimista). */
  falharAtualizacaoDeItem: boolean;
  /** Força 401 em GET /api/auth/me (token expirado). */
  tokenExpirado: boolean;
}

function json(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function problema(status: number, detail: string, erros?: { campo: string; mensagem: string }[]) {
  return new Response(JSON.stringify({ status, title: 'Erro', detail, erros }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

export function criarApiFalsa() {
  let proximoId = 1000;
  const agora = new Date().toISOString();
  const usuario: Usuario = { id: 1, nome: 'Ana', email: 'ana@exemplo.com' };

  const estado: Estado = {
    usuario,
    familia: {
      id: 10,
      nome: 'Casa da Ana',
      codigoConvite: 'K7M2Q9XA',
      meuPapel: 'ADMIN',
      criadoEm: agora,
      membros: [
        { usuarioId: 1, nome: 'Ana', email: usuario.email, papel: 'ADMIN', entrouEm: agora },
      ],
    },
    listas: [
      {
        id: 100,
        familiaId: 10,
        nome: 'Mercado',
        arquivada: false,
        criadaEm: agora,
        totalItens: 0,
        itensComprados: 0,
      },
    ],
    itens: [],
    falharAtualizacaoDeItem: false,
    tokenExpirado: false,
  };
  const chamadas: Chamada[] = [];

  const detalheLista = (lista: Lista) => ({
    ...lista,
    itens: estado.itens.filter((i) => i.listaId === lista.id),
  });

  async function responder(url: string, init: RequestInit = {}): Promise<Response> {
    const { pathname, searchParams } = new URL(url);
    const metodo = init.method ?? 'GET';
    const corpo = init.body ? JSON.parse(String(init.body)) : undefined;
    chamadas.push({ metodo, caminho: pathname, corpo });

    const rota = `${metodo} ${pathname}`;
    let m: RegExpMatchArray | null;

    if (rota === 'GET /actuator/health') return json(200, { status: 'UP' });

    if (rota === 'POST /api/auth/login') {
      if (corpo.email === usuario.email && corpo.senha === SENHA_CORRETA) {
        return json(200, { token: TOKEN, expiraEm: agora, usuario });
      }
      return problema(401, 'E-mail ou senha incorretos.');
    }

    if (rota === 'POST /api/auth/cadastro') {
      return json(201, {
        token: TOKEN,
        expiraEm: agora,
        usuario: { ...usuario, nome: corpo.nome },
      });
    }

    if (rota === 'GET /api/auth/me') {
      return estado.tokenExpirado ? problema(401, 'Token expirado.') : json(200, usuario);
    }

    if (rota === 'GET /api/familias') {
      const { id, nome, meuPapel, membros } = estado.familia;
      return json(200, [{ id, nome, meuPapel, totalMembros: membros.length }]);
    }

    if ((m = rota.match(/^GET \/api\/familias\/(\d+)$/))) {
      return Number(m[1]) === estado.familia.id
        ? json(200, estado.familia)
        : problema(404, 'Família não encontrada.');
    }

    if ((m = rota.match(/^GET \/api\/familias\/(\d+)\/listas$/))) {
      const arquivadas = searchParams.get('arquivadas') === 'true';
      return json(
        200,
        estado.listas
          .filter((l) => l.familiaId === Number(m![1]) && l.arquivada === arquivadas)
          .map((l) => {
            const itens = estado.itens.filter((i) => i.listaId === l.id);
            return {
              ...l,
              totalItens: itens.length,
              itensComprados: itens.filter((i) => i.comprado).length,
            };
          }),
      );
    }

    if ((m = rota.match(/^POST \/api\/familias\/(\d+)\/listas$/))) {
      const lista: Lista = {
        id: ++proximoId,
        familiaId: Number(m[1]),
        nome: corpo.nome,
        arquivada: false,
        criadaEm: agora,
        totalItens: 0,
        itensComprados: 0,
      };
      estado.listas.push(lista);
      return json(201, lista);
    }

    if ((m = rota.match(/^GET \/api\/listas\/(\d+)$/))) {
      const lista = estado.listas.find((l) => l.id === Number(m![1]));
      return lista ? json(200, detalheLista(lista)) : problema(404, 'Lista não encontrada.');
    }

    if ((m = rota.match(/^POST \/api\/listas\/(\d+)\/itens$/))) {
      if (!corpo.nome?.trim()) {
        return problema(400, 'Verifique os campos informados.', [
          { campo: 'nome', mensagem: 'Informe o nome do item.' },
        ]);
      }
      const item: Item = {
        id: ++proximoId,
        listaId: Number(m[1]),
        nome: corpo.nome,
        quantidade: corpo.quantidade ?? null,
        observacao: corpo.observacao ?? null,
        comprado: false,
        compradoPor: null,
        adicionadoPor: { id: usuario.id, nome: usuario.nome },
        criadoEm: agora,
        atualizadoEm: agora,
      };
      estado.itens.push(item);
      return json(201, item);
    }

    if ((m = rota.match(/^PATCH \/api\/itens\/(\d+)$/))) {
      if (estado.falharAtualizacaoDeItem) return problema(500, 'Erro interno.');
      const item = estado.itens.find((i) => i.id === Number(m![1]));
      if (!item) return problema(404, 'Item não encontrado.');
      if (corpo.comprado !== undefined) {
        item.comprado = corpo.comprado;
        item.compradoPor = corpo.comprado ? { id: usuario.id, nome: usuario.nome } : null;
      }
      return json(200, item);
    }

    return problema(404, `Rota não simulada: ${rota}`);
  }

  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((entrada, init) => responder(String(entrada), init));

  return { estado, chamadas, fetchMock };
}
