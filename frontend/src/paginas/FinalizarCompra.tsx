import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/cliente';
import { comprasApi, familiasApi, listasApi } from '../api/endpoints';
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
import paginas from './Paginas.module.css';
import { rotaListas } from './rotasFamilia';

const temValor = (item: Item) =>
  subtotal(item.tipoPreco, item.preco, item.quantidadePega) !== undefined;

/**
 * Finalizar a compra: confere o valor calculado e informa o valor final pago (do cupom), o
 * mercado e a data. O valor final e o valor dos itens sem preço (descoberto no caixa) andam
 * juntos: final = itens com preço + variável. Dá para digitar qualquer um dos dois.
 * Itens não planejados: pergunta quais ficam na lista.
 */
export function FinalizarCompra() {
  const { listaId: parametro } = useParams();
  const listaId = Number(parametro);
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const idMercados = useId();

  const lista = useQuery({
    queryKey: chaves.lista(listaId),
    queryFn: () => listasApi.detalhar(listaId),
    enabled: Number.isFinite(listaId),
  });
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

  const [variavel, setVariavel] = useState('');
  // Valor final digitado; null = acompanha o calculado (itens com preço + variável)
  const [final, setFinal] = useState<string | null>(null);
  const [mercado, setMercado] = useState('');
  const [data, setData] = useState(hoje());
  const [perguntandoExtras, setPerguntandoExtras] = useState(false);
  const [extrasMantidos, setExtrasMantidos] = useState<number[]>([]);
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const finalizar = useMutation({
    mutationFn: (valorVariavel: number) =>
      comprasApi.finalizar(listaId, {
        mercado: mercado.trim(),
        dataCompra: data,
        valorVariavel,
        extrasMantidos,
      }),
    onSuccess: (compra) => {
      void queryClient.invalidateQueries({ queryKey: chaves.lista(listaId) });
      void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
      void queryClient.invalidateQueries({ queryKey: chaves.todasCompras });
      navegar(`/compras/${compra.id}`, { replace: true });
    },
  });
  const erro = finalizar.error instanceof ApiError ? finalizar.error : undefined;

  if (lista.isPending) return <Carregando linhas={4} />;
  if (lista.isError) {
    return <MensagemErro erro={lista.error} aoTentarDeNovo={() => void lista.refetch()} />;
  }

  const dados = lista.data;
  const pegos = dados.itens.filter((i) => i.pego);
  const semPreco = pegos.filter((i) => !temValor(i));
  const extras = pegos.filter((i) => i.extra);
  const { total: valorItens } = totalDaCompra(dados.itens);
  const mercados = [...new Set((compras.data ?? []).map((c) => c.mercado))];

  const valorVariavel = lerDecimal(variavel);
  // Sem itens sem preço, o final já nasce igual ao calculado; com eles, depende do variável
  const finalCalculado =
    semPreco.length === 0 || valorVariavel !== undefined
      ? centavos(valorItens + (valorVariavel ?? 0))
      : undefined;
  const textoFinal =
    final ?? (finalCalculado !== undefined ? paraCampoDinheiro(finalCalculado) : '');
  const valorFinal = lerDecimal(textoFinal);
  /** O que vai para o backend como "valor variável": tudo o que o cupom tem além dos itens com preço. */
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

  /** Digitou o valor dos itens sem preço: o final volta a acompanhar o calculado. */
  function mudarVariavel(texto: string) {
    setVariavel(texto);
    setFinal(null);
  }

  /** Digitou o valor final: o variável passa a ser a diferença para os itens com preço. */
  function mudarFinal(texto: string) {
    setFinal(texto);
    const novo = lerDecimal(texto);
    setVariavel(
      novo !== undefined && novo >= valorItens
        ? paraCampoDinheiro(centavos(novo - valorItens))
        : '',
    );
  }

  const finalValido = diferenca !== undefined && diferenca >= 0;
  const erroFinal = !tentouEnviar
    ? (erro?.erroDoCampo('valorVariavel') ?? undefined)
    : valorFinal === undefined
      ? 'Informe o valor final pago (está no cupom do caixa).'
      : !finalValido
        ? `O valor final não pode ser menor que o dos itens com preço (${formatarDinheiro(valorItens)}). Confira os preços marcados.`
        : undefined;
  const erroVariavel =
    semPreco.length > 0 && tentouEnviar && valorFinal === undefined
      ? 'Informe quanto custaram os itens sem preço, ou o valor final pago.'
      : undefined;
  const erroMercado =
    tentouEnviar && !mercado.trim() ? 'Informe o mercado.' : erro?.erroDoCampo('mercado');

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    setTentouEnviar(true);
    if (!mercado.trim() || !data || !finalValido) return;
    if (extras.length > 0) setPerguntandoExtras(true);
    else finalizar.mutate(diferenca);
  }

  return (
    <div className={[paginas.pagina, paginas.estreita].join(' ')}>
      <CabecalhoPagina
        trilha={trilha}
        rotulo={dados.nome}
        titulo="Finalizar compra"
        descricao="Confira os valores, informe o valor final do cupom e onde a compra foi feita."
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
            {(semPreco.length > 0 || (diferenca !== undefined && diferenca !== 0)) && (
              <div className={estilos.linha}>
                <dt>
                  {semPreco.length > 0 ? 'Valor variável' : 'Diferença no caixa'}
                  {semPreco.length > 0 && (
                    <span className={estilos.contagem}>{semPreco.length}</span>
                  )}
                </dt>
                <dd>{diferenca !== undefined ? formatarDinheiro(diferenca) : '—'}</dd>
              </div>
            )}
            <div className={[estilos.linha, estilos.total].join(' ')}>
              <dt>Total da compra</dt>
              <dd>{valorFinal !== undefined ? formatarDinheiro(valorFinal) : '—'}</dd>
            </div>
          </dl>
          <Campo
            rotulo="Valor final pago (R$)"
            dica="Confira com o total do cupom do caixa."
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ex.: 653,46"
            value={textoFinal}
            onChange={(e) => mudarFinal(e.target.value)}
            erro={erroFinal}
          />
        </Card>

        {semPreco.length > 0 && (
          <section className={estilos.variavel} aria-labelledby="titulo-variavel">
            <h2 id="titulo-variavel" className={estilos.titulo}>
              Itens com valor do caixa
            </h2>
            <p className={estilos.texto}>
              Estes itens foram pegos sem preço. Informe quanto custaram somados, ou só o valor
              final pago acima: a diferença é calculada.
            </p>
            <ul className={estilos.semPreco}>
              {semPreco.map((item) => (
                <li key={item.id}>{item.nome}</li>
              ))}
            </ul>
            <Campo
              rotulo="Valor dos itens sem preço (R$)"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Ex.: 23,40"
              value={variavel}
              onChange={(e) => mudarVariavel(e.target.value)}
              erro={erroVariavel}
            />
          </section>
        )}

        <Card className={estilos.onde}>
          <h2 className={estilos.titulo}>Onde e quando</h2>
          <Campo
            rotulo="Mercado"
            placeholder="Ex.: Atacadão"
            maxLength={100}
            autoComplete="off"
            list={idMercados}
            value={mercado}
            onChange={(e) => setMercado(e.target.value)}
            erro={erroMercado}
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
            erro={erro?.erroDoCampo('dataCompra')}
          />
        </Card>

        {erro &&
          erro.erros.every(
            (e) => !['mercado', 'dataCompra', 'valorVariavel'].includes(e.campo),
          ) && (
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
          <Botao
            variante="primario"
            carregando={finalizar.isPending}
            onClick={() => diferenca !== undefined && finalizar.mutate(diferenca)}
          >
            Concluir compra
          </Botao>
        </div>
      </Modal>
    </div>
  );
}
