import { vi } from 'vitest';
import type { Categoria, CompraDetalhe, FamiliaDetalhe, Item, Lista, Usuario } from '../api/tipos';
import { formatarQuantidade, subtotal } from '../util/compra';

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
  categorias: Categoria[];
  /** Nomes consultados em /sugestao-item, na ordem. */
  sugestoesPedidas: string[];
  listas: Lista[];
  itens: Item[];
  compras: CompraDetalhe[];
  /** Força erro 500 ao desmarcar um item (para testar o rollback otimista). */
  falharDesmarcar: boolean;
  /** Força 401 em GET /api/auth/me (token expirado). */
  tokenExpirado: boolean;
  /** Versão de cada lista: sobe a cada alteração em itens dela (como no backend). */
  versoesListas: Map<number, number>;
}

function json(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function vazio() {
  return new Response(null, { status: 204 });
}

function problema(status: number, detail: string, erros?: { campo: string; mensagem: string }[]) {
  return new Response(JSON.stringify({ status, title: 'Erro', detail, erros }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

export const CATEGORIAS: Categoria[] = [
  { id: 1, nome: 'Padaria', ordem: 1, fixa: false },
  { id: 2, nome: 'Hortifrúti e Congelados', ordem: 2, fixa: false },
  { id: 3, nome: 'Outros', ordem: 3, fixa: true },
];

/** Item planejado para montar cenários nos testes. */
export function novoItem(dados: Partial<Item> & { id: number; nome: string }): Item {
  const agora = new Date().toISOString();
  return {
    listaId: 100,
    categoriaId: 1,
    quantidadePlanejada: null,
    medida: 'UNIDADE',
    pego: false,
    pegoEm: null,
    pegoPor: null,
    quantidadePega: null,
    tipoPreco: 'UNIDADE',
    preco: null,
    subtotal: null,
    marca: null,
    extra: false,
    adicionadoPor: { id: 1, nome: 'Ana' },
    criadoEm: agora,
    atualizadoEm: agora,
    versao: 0,
    ...dados,
  };
}

export function criarApiFalsa() {
  let proximoId = 1000;
  const agora = new Date().toISOString();
  const usuario: Usuario = { id: 1, nome: 'Ana', email: 'ana@exemplo.com' };
  const quem = { id: usuario.id, nome: usuario.nome };

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
    categorias: [...CATEGORIAS],
    sugestoesPedidas: [],
    listas: [
      { id: 100, familiaId: 10, nome: 'Mercado', criadaEm: agora, totalItens: 0, itensPegos: 0 },
    ],
    itens: [],
    compras: [],
    falharDesmarcar: false,
    tokenExpirado: false,
    versoesListas: new Map(),
  };
  const chamadas: Chamada[] = [];

  const itensDa = (listaId: number) => estado.itens.filter((i) => i.listaId === listaId);
  const versaoDa = (listaId: number) => estado.versoesListas.get(listaId) ?? 0;
  /** Registra uma alteração na lista; com a versão esperada diferente da atual, recusa (409). */
  function alterarLista(listaId: number, esperada?: number | null): boolean {
    if (esperada != null && esperada !== versaoDa(listaId)) return false;
    estado.versoesListas.set(listaId, versaoDa(listaId) + 1);
    return true;
  }
  const conflito = () =>
    problema(409, 'Outra pessoa alterou este item agora há pouco. Confira e tente de novo.');

  /**
   * Simula outra pessoa, em outro aparelho, alterando um item (sobe as versões como o backend).
   */
  function alterarEmOutroAparelho(itemId: number, mudancas: Partial<Item>) {
    const item = estado.itens.find((i) => i.id === itemId)!;
    Object.assign(item, mudancas, { versao: item.versao + 1 });
    Object.assign(item, comSubtotal(item));
    alterarLista(item.listaId);
  }
  const comSubtotal = (item: Item): Item => ({
    ...item,
    subtotal: item.pego
      ? (subtotal(item.tipoPreco, item.preco, item.quantidadePega) ?? null)
      : null,
  });
  const desmarcar = (item: Item) =>
    Object.assign(item, {
      pego: false,
      pegoEm: null,
      pegoPor: null,
      quantidadePega: null,
      tipoPreco: 'UNIDADE',
      preco: null,
      subtotal: null,
      marca: null,
    });
  function pegar(item: Item, corpo: Record<string, unknown>) {
    Object.assign(item, {
      pego: true,
      pegoEm: item.pegoEm ?? new Date().toISOString(),
      pegoPor: quem,
      quantidadePega: corpo.quantidadePega ?? null,
      tipoPreco: corpo.tipoPreco ?? 'UNIDADE',
      preco: corpo.preco ?? null,
      marca: corpo.marca ?? null,
    });
    Object.assign(item, comSubtotal(item));
  }

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

    if ((m = rota.match(/^GET \/api\/familias\/(\d+)\/categorias$/))) {
      return json(200, estado.categorias);
    }

    if ((m = rota.match(/^GET \/api\/familias\/(\d+)\/listas$/))) {
      return json(
        200,
        estado.listas
          .filter((l) => l.familiaId === Number(m![1]))
          .map((l) => ({
            ...l,
            totalItens: itensDa(l.id).length,
            itensPegos: itensDa(l.id).filter((i) => i.pego).length,
          })),
      );
    }

    if ((m = rota.match(/^POST \/api\/familias\/(\d+)\/listas$/))) {
      const lista: Lista = {
        id: ++proximoId,
        familiaId: Number(m[1]),
        nome: corpo.nome,
        criadaEm: agora,
        totalItens: 0,
        itensPegos: 0,
      };
      estado.listas.push(lista);
      return json(201, lista);
    }

    if ((m = rota.match(/^POST \/api\/familias\/(\d+)\/listas\/importar$/))) {
      const lista: Lista = {
        id: ++proximoId,
        familiaId: Number(m[1]),
        nome: corpo.nome,
        criadaEm: agora,
        totalItens: corpo.itens.length,
        itensPegos: 0,
      };
      estado.listas.push(lista);
      for (const dados of corpo.itens) {
        estado.itens.push(novoItem({ id: ++proximoId, listaId: lista.id, ...dados }));
      }
      return json(201, lista);
    }

    if ((m = rota.match(/^GET \/api\/listas\/(\d+)$/))) {
      const lista = estado.listas.find((l) => l.id === Number(m![1]));
      if (!lista) return problema(404, 'Lista não encontrada.');
      const { id, familiaId, nome, criadaEm } = lista;
      return json(200, {
        id,
        familiaId,
        nome,
        criadaEm,
        versao: versaoDa(id),
        categorias: estado.categorias,
        itens: itensDa(lista.id).map(comSubtotal),
      });
    }

    if ((m = rota.match(/^POST \/api\/listas\/(\d+)\/itens$/))) {
      if (!corpo.nome?.trim() || !corpo.medida) {
        return problema(400, 'Verifique os campos informados.', [
          ...(corpo.nome?.trim() ? [] : [{ campo: 'nome', mensagem: 'Informe o nome do item.' }]),
          ...(corpo.medida ? [] : [{ campo: 'medida', mensagem: 'Escolha a medida.' }]),
        ]);
      }
      const item = novoItem({
        id: ++proximoId,
        listaId: Number(m[1]),
        nome: corpo.nome,
        categoriaId: corpo.categoriaId,
        quantidadePlanejada: corpo.quantidadePlanejada ?? null,
        medida: corpo.medida,
        tipoPreco: corpo.medida,
      });
      alterarLista(item.listaId);
      estado.itens.push(item);
      return json(201, item);
    }

    if ((m = rota.match(/^POST \/api\/listas\/(\d+)\/itens\/extra$/))) {
      const item = novoItem({
        id: ++proximoId,
        listaId: Number(m[1]),
        nome: corpo.nome,
        categoriaId: corpo.categoriaId,
        extra: true,
      });
      pegar(item, corpo);
      alterarLista(item.listaId);
      estado.itens.push(item);
      return json(201, item);
    }

    if ((m = rota.match(/^POST \/api\/listas\/(\d+)\/desmarcar-todos$/))) {
      if (!alterarLista(Number(m[1]), Number(searchParams.get('versao')))) {
        return problema(409, 'A lista mudou enquanto você a usava.');
      }
      itensDa(Number(m[1])).forEach(desmarcar);
      return vazio();
    }

    if ((m = rota.match(/^(PUT|DELETE) \/api\/itens\/(\d+)\/pego$/))) {
      const item = estado.itens.find((i) => i.id === Number(m![2]));
      if (!item) return problema(404, 'Item não encontrado.');
      const esperada = m[1] === 'DELETE' ? Number(searchParams.get('versao')) : corpo.versao;
      if (esperada != null && esperada !== item.versao) return conflito();
      if (m[1] === 'DELETE') {
        if (estado.falharDesmarcar) return problema(500, 'Erro interno.');
        desmarcar(item);
      } else {
        pegar(item, corpo);
      }
      item.versao++;
      alterarLista(item.listaId);
      return json(200, item);
    }

    if ((m = rota.match(/^POST \/api\/listas\/(\d+)\/compras$/))) {
      const listaId = Number(m[1]);
      const lista = estado.listas.find((l) => l.id === listaId)!;
      if (!alterarLista(listaId, corpo.versaoLista)) {
        return problema(409, 'A lista mudou enquanto você finalizava.');
      }
      const itens = itensDa(listaId).map(comSubtotal);
      const valorItens = itens.reduce((soma, i) => soma + (i.subtotal ?? 0), 0);
      const compra: CompraDetalhe = {
        id: ++proximoId,
        familiaId: lista.familiaId,
        listaId,
        listaNome: lista.nome,
        mercado: corpo.mercado ?? null,
        dataCompra: corpo.dataCompra,
        valorItens,
        valorVariavel: corpo.valorTotal - valorItens,
        valorTotal: corpo.valorTotal,
        totalItens: itens.length,
        itensPegos: itens.filter((i) => i.pego).length,
        exemplo: false,
        finalizadaPor: usuario.nome,
        finalizadaEm: agora,
        itens: itens.map((i) => ({
          id: i.id,
          nome: i.nome,
          categoria: estado.categorias.find((c) => c.id === i.categoriaId)?.nome ?? 'Outros',
          categoriaOrdem: 1,
          quantidadePlanejada:
            i.quantidadePlanejada !== null
              ? formatarQuantidade(i.quantidadePlanejada, i.medida)
              : null,
          pego: i.pego,
          quantidadePega: i.quantidadePega,
          tipoPreco: i.tipoPreco,
          preco: i.preco,
          subtotal: i.subtotal,
          marca: i.marca,
          extra: i.extra,
        })),
      };
      estado.compras.push(compra);
      itensDa(listaId).forEach(desmarcar);
      return json(201, compra);
    }

    // Sugestão pelo nome: "banana" vem do dicionário (Hortifrúti, por kg); o resto, padrão
    if ((m = rota.match(/^GET \/api\/familias\/(\d+)\/sugestao-item$/))) {
      estado.sugestoesPedidas.push(searchParams.get('nome') ?? '');
      const nome = (searchParams.get('nome') ?? '').toLowerCase();
      return json(
        200,
        nome.startsWith('banana')
          ? { categoriaId: 2, medida: 'KG', origem: 'DICIONARIO' }
          : { categoriaId: 3, medida: 'UNIDADE', origem: 'PADRAO' },
      );
    }

    if ((m = rota.match(/^GET \/api\/familias\/(\d+)\/compras\/resumo$/))) {
      const mes = searchParams.get('mes') ?? '';
      const doMes = estado.compras.filter((c) => c.dataCompra.startsWith(mes));
      return json(200, {
        mes,
        gasto: doMes.reduce((soma, c) => soma + c.valorTotal, 0),
        compras: doMes.length,
        ultimaCompra: estado.compras.at(-1) ?? null,
      });
    }

    if ((m = rota.match(/^GET \/api\/familias\/(\d+)\/compras$/))) {
      return json(200, estado.compras);
    }

    if ((m = rota.match(/^GET \/api\/compras\/(\d+)$/))) {
      const compra = estado.compras.find((c) => c.id === Number(m![1]));
      return compra ? json(200, compra) : problema(404, 'Compra não encontrada.');
    }

    return problema(404, `Rota não simulada: ${rota}`);
  }

  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((entrada, init) => responder(String(entrada), init));

  return { estado, chamadas, fetchMock, alterarEmOutroAparelho };
}
