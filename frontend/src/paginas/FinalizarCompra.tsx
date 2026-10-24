import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/cliente';
import { comprasApi, familiasApi } from '../api/endpoints';
import type { Item } from '../api/tipos';
import { Botao, LinkBotao } from '../components/Botao';
import { CabecalhoPagina } from '../components/CabecalhoPagina';
import { Campo } from '../components/Campo';
import { Card } from '../components/Card';
import { Carregando, EstadoVazio, MensagemErro } from '../components/Estados';
import form from '../components/Formulario.module.css';
import { IconeCarrinho } from '../components/Icones';
import { Modal } from '../components/Modal';
import { chaves } from '../estado/chaves';
import {
  centavos,
  formatarDinheiro,
  hoje,
  lerDecimal,
  paraCampoDinheiro,
  subtotal,
  totalDaCompra,
} from '../util/compra';
import estilos from './FinalizarCompra.module.css';
import { AvisoSincronia } from './AvisoSincronia';
import { antesDeAlterar, ehDesatualizado } from './cacheLista';
import paginas from './Paginas.module.css';
import { rotaListas } from './rotasFamilia';
import { useLista } from './useLista';

const temValor = (item: Item) =>
  subtotal(item.tipoPreco, item.preco, item.quantidadePega) !== undefined;

/**
 * Finalizar a compra: só o valor final pago (do cupom) é obrigatório. Ele já vem com a soma dos
 * itens e pode ser corrigido: menor que a soma fica como desconto; maior, como diferença no caixa
 * (acréscimo ou itens sem preço). O mercado é opcional e a data já vem como hoje.
 * Itens não planejados: pergunta quais ficam na lista.
 *
 * Os valores continuam sincronizados enquanto a tela está aberta (outra pessoa pode estar marcando
 * itens) e a finalização leva a versão da lista: só é aceita se o que foi conferido aqui ainda for
 * exatamente o que está no servidor.
 */
export function FinalizarCompra() {
  const { listaId: parametro } = useParams();
  const listaId = Number(parametro);
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const idMercados = useId();

  const lista = useLista(listaId);
  const familiaId = lista.data?.familiaId;
  const familia = useQuery({
    queryKey: chaves.familia(familiaId ?? 0),
    queryFn: () => familiasApi.detalhar(familiaId ?? 0),
    enabled: familiaId !== undefined,
  });
  // Mercados já usados pela família, como sugestão no campo
  const compras = useQuery({
    queryKey: chaves.compras(familiaId ?? 0),
    queryFn: () => comprasApi.listar(familiaId ?? 0),
    enabled: familiaId !== undefined,
  });

  // Valor final digitado; null = acompanha a soma dos itens (que muda se outra pessoa marcar algo)
  const [final, setFinal] = useState<string | null>(null);
  const [mercado, setMercado] = useState('');
  const [data, setData] = useState(hoje());
  const [perguntandoExtras, setPerguntandoExtras] = useState(false);
  const [extrasMantidos, setExtrasMantidos] = useState<number[]>([]);
  const [tentouEnviar, setTentouEnviar] = useState(false);
  // Versão da lista que a pessoa já viu aqui: se mudar (outra pessoa alterou itens), avisa
  const [versaoVista, setVersaoVista] = useState<number>();
  if (lista.data && versaoVista === undefined) setVersaoVista(lista.data.versao);

  const finalizar = useMutation({
    mutationFn: ({ valorTotal, versaoLista }: { valorTotal: number; versaoLista: number }) =>
      comprasApi.finalizar(listaId, {
        valorTotal,
        mercado: mercado.trim() || undefined,
        dataCompra: data,
        extrasMantidos,
        versaoLista,
      }),
    onMutate: () => antesDeAlterar(queryClient, listaId),
    onError: (erro) => {
      // A lista mudou: busca a atual e volta ao formulário para a pessoa conferir os valores
      if (!ehDesatualizado(erro)) return;
      setPerguntandoExtras(false);
      void queryClient.invalidateQueries({ queryKey: chaves.lista(listaId) });
    },
    onSuccess: (compra) => {
      void queryClient.invalidateQueries({ queryKey: chaves.lista(listaId) });
      void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
      void queryClient.invalidateQueries({ queryKey: chaves.todasCompras });
      navegar(`/compras/${compra.id}`, { replace: true });
    },
  });
  const erro = finalizar.error instanceof ApiError ? finalizar.error : undefined;

  if (lista.isPending) return <Carregando linhas={4} />;
  if (!lista.data) {
    return <MensagemErro erro={lista.error} aoTentarDeNovo={() => void lista.refetch()} />;
  }

  const dados = lista.data;
  const listaMudou = versaoVista !== undefined && versaoVista !== dados.versao;
  const pegos = dados.itens.filter((i) => i.pego);
  const semPreco = pegos.filter((i) => !temValor(i));
  const extras = pegos.filter((i) => i.extra);
  const { total: valorItens } = totalDaCompra(dados.itens);
  const mercados = [
    ...new Set((compras.data ?? []).flatMap((c) => (c.mercado ? [c.mercado] : []))),
  ];

  const textoFinal = final ?? paraCampoDinheiro(valorItens);
  const valorFinal = lerDecimal(textoFinal);
  /** Diferença no caixa: negativa é desconto; positiva, acréscimo ou itens sem preço. */
  const diferenca = valorFinal !== undefined ? centavos(valorFinal - valorItens) : undefined;

  const trilha = [
    { rotulo: familia.data?.nome ?? 'Listas', para: rotaListas(dados.familiaId) },
    { rotulo: dados.nome, para: `/listas/${dados.id}/comprar` },
  ];

  if (pegos.length === 0) {
    return (
      <div className={[paginas.pagina, paginas.estreita].join(' ')}>
        <CabecalhoPagina trilha={trilha} rotulo={dados.nome} titulo="Finalizar compra" />
        <EstadoVazio
          icone={<IconeCarrinho />}
          titulo="Nenhum item marcado"
          acao={<LinkBotao to={`/listas/${dados.id}/comprar`}>Voltar à compra</LinkBotao>}
        >
          Marque na aba Comprar o que foi pego antes de finalizar.
        </EstadoVazio>
      </div>
    );
  }

  const finalValido = valorFinal !== undefined && valorFinal >= 0;
  const erroFinal =
    tentouEnviar && !finalValido
      ? 'Informe o valor final pago (está no cupom do caixa).'
      : erro?.erroDoCampo('valorTotal');
  const erroData =
    tentouEnviar && !data ? 'Informe a data da compra.' : erro?.erroDoCampo('dataCompra');

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    setTentouEnviar(true);
    if (!data || !finalValido) return;
    if (extras.length > 0) setPerguntandoExtras(true);
    else concluir();
  }

  /** Envia com a versão da lista dos valores mostrados agora na tela. */
  function concluir() {
    if (valorFinal === undefined) return;
    setVersaoVista(dados.versao);
    finalizar.mutate({ valorTotal: centavos(valorFinal), versaoLista: dados.versao });
  }

  return (
    <div className={[paginas.pagina, paginas.estreita].join(' ')}>
      <CabecalhoPagina
        trilha={trilha}
        rotulo={dados.nome}
        titulo="Finalizar compra"
        descricao="Confira o valor final com o cupom do caixa. O resto é opcional."
      />

      <AvisoSincronia
        semConexao={lista.isRefetchError}
        aviso={
          listaMudou
            ? 'Outra pessoa alterou a lista enquanto você estava aqui. Os valores abaixo já estão atualizados; confira antes de concluir.'
            : undefined
        }
        aoFecharAviso={() => setVersaoVista(dados.versao)}
      />

      <form className={estilos.formulario} onSubmit={enviar} noValidate>
        <Card className={estilos.resumo}>
          <h2 className={estilos.titulo}>Resumo</h2>
          <dl className={estilos.linhas}>
            <div className={estilos.linha}>
              <dt>
                Itens com preço{' '}
                <span className={estilos.contagem}>{pegos.length - semPreco.length}</span>
              </dt>
              <dd>{formatarDinheiro(valorItens)}</dd>
            </div>
            {diferenca !== undefined && diferenca !== 0 && (
              <div className={estilos.linha}>
                <dt>{diferenca < 0 ? 'Desconto' : 'Diferença no caixa'}</dt>
                <dd>{formatarDinheiro(diferenca)}</dd>
              </div>
            )}
            <div className={[estilos.linha, estilos.total].join(' ')}>
              <dt>Total da compra</dt>
              <dd>{valorFinal !== undefined ? formatarDinheiro(valorFinal) : '—'}</dd>
            </div>
          </dl>
          <Campo
            rotulo="Valor final pago (R$)"
            dica="Já vem com a soma dos itens. Se o cupom tiver outro valor (um desconto, por exemplo), corrija aqui."
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ex.: 653,46"
            value={textoFinal}
            onChange={(e) => setFinal(e.target.value)}
            erro={erroFinal}
          />
        </Card>

        {semPreco.length > 0 && (
          <section className={estilos.variavel} aria-labelledby="titulo-variavel">
            <h2 id="titulo-variavel" className={estilos.titulo}>
              Itens sem preço
            </h2>
            <p className={estilos.texto}>
              Estes itens foram pegos sem preço e não estão na soma. Inclua o valor deles no valor
              final pago acima.
            </p>
            <ul className={estilos.semPreco}>
              {semPreco.map((item) => (
                <li key={item.id}>{item.nome}</li>
              ))}
            </ul>
          </section>
        )}

        <Card className={estilos.onde}>
          <h2 className={estilos.titulo}>Onde e quando</h2>
          <Campo
            rotulo="Mercado (opcional)"
            placeholder="Ex.: Atacadão"
            maxLength={100}
            autoComplete="off"
            list={idMercados}
            value={mercado}
            onChange={(e) => setMercado(e.target.value)}
            erro={erro?.erroDoCampo('mercado')}
          />
          <datalist id={idMercados}>
            {mercados.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <Campo
            rotulo="Data da compra"
            type="date"
            max={hoje()}
            value={data}
            onChange={(e) => setData(e.target.value)}
            erro={erroData}
          />
        </Card>

        {erro &&
          erro.erros.every((e) => !['mercado', 'dataCompra', 'valorTotal'].includes(e.campo)) && (
            <p className={form.erro} role="alert">
              {erro.erros[0]?.mensagem ?? erro.message}
            </p>
          )}

        <div className={estilos.acoes}>
          <LinkBotao to={`/listas/${dados.id}/comprar`} variante="fantasma">
            Voltar à compra
          </LinkBotao>
          <Botao
            type="submit"
            variante="primario"
            carregando={finalizar.isPending && !perguntandoExtras}
          >
            Concluir compra
          </Botao>
        </div>
      </form>

      <Modal
        aberto={perguntandoExtras}
        titulo="Manter itens não planejados?"
        aoFechar={() => setPerguntandoExtras(false)}
      >
        <p className={form.texto}>
          Estes itens foram comprados sem estar na lista. Marque os que devem fazer parte dela nas
          próximas compras; os outros ficam só no registro desta compra.
        </p>
        <ul className={estilos.extras}>
          {extras.map((item) => (
            <li key={item.id}>
              <label className={form.caixa}>
                <input
                  type="checkbox"
                  checked={extrasMantidos.includes(item.id)}
                  onChange={(e) =>
                    setExtrasMantidos((atual) =>
                      e.target.checked ? [...atual, item.id] : atual.filter((id) => id !== item.id),
                    )
                  }
                />
                {item.nome}
              </label>
            </li>
          ))}
        </ul>
        {erro && (
          <p className={form.erro} role="alert">
            {erro.erros[0]?.mensagem ?? erro.message}
          </p>
        )}
        <div className={form.acoes}>
          <Botao variante="fantasma" onClick={() => setPerguntandoExtras(false)}>
            Voltar
          </Botao>
          <Botao variante="primario" carregando={finalizar.isPending} onClick={concluir}>
            Concluir compra
          </Botao>
        </div>
      </Modal>
    </div>
  );
}
