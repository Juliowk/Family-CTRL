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
import { formatarDinheiro, hoje, lerDecimal, subtotal, totalDaCompra } from '../util/compra';
import estilos from './FinalizarCompra.module.css';
import paginas from './Paginas.module.css';

const temValor = (item: Item) =>
  subtotal(item.tipoPreco, item.preco, item.quantidadePega) !== undefined;

/**
 * Finalizar a compra: confere o valor calculado, informa o valor dos itens sem preço (descoberto
 * no caixa), o mercado e a data. Itens não planejados: pergunta quais ficam na lista.
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
  const [mercado, setMercado] = useState('');
  const [data, setData] = useState(hoje());
  const [perguntandoExtras, setPerguntandoExtras] = useState(false);
  const [extrasMantidos, setExtrasMantidos] = useState<number[]>([]);
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const finalizar = useMutation({
    mutationFn: () =>
      comprasApi.finalizar(listaId, {
        mercado: mercado.trim(),
        dataCompra: data,
        valorVariavel: lerDecimal(variavel) ?? 0,
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
  const valorVariavel = lerDecimal(variavel);
  const totalGeral = valorItens + (valorVariavel ?? 0);
  const mercados = [...new Set((compras.data ?? []).map((c) => c.mercado))];

  const trilha = [
    { rotulo: familia.data?.nome ?? 'Listas', para: `/familias/${dados.familiaId}` },
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

  const erroVariavel =
    semPreco.length > 0 && tentouEnviar && (valorVariavel === undefined || valorVariavel < 0)
      ? 'Informe quanto custaram os itens sem preço (veja no cupom do caixa).'
      : (erro?.erroDoCampo('valorVariavel') ?? undefined);
  const erroMercado =
    tentouEnviar && !mercado.trim() ? 'Informe o mercado.' : erro?.erroDoCampo('mercado');

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    setTentouEnviar(true);
    if (!mercado.trim() || !data) return;
    if (semPreco.length > 0 && (valorVariavel === undefined || valorVariavel < 0)) return;
    if (extras.length > 0) setPerguntandoExtras(true);
    else finalizar.mutate();
  }

  return (
    <div className={[paginas.pagina, paginas.estreita].join(' ')}>
      <CabecalhoPagina
        trilha={trilha}
        rotulo={dados.nome}
        titulo="Finalizar compra"
        descricao="Confira os valores e informe onde a compra foi feita."
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
            {semPreco.length > 0 && (
              <div className={estilos.linha}>
                <dt>
                  Valor variável <span className={estilos.contagem}>{semPreco.length}</span>
                </dt>
                <dd>{valorVariavel !== undefined ? formatarDinheiro(valorVariavel) : '—'}</dd>
              </div>
            )}
            <div className={[estilos.linha, estilos.total].join(' ')}>
              <dt>Total da compra</dt>
              <dd>{formatarDinheiro(totalGeral)}</dd>
            </div>
          </dl>
        </Card>

        {semPreco.length > 0 && (
          <section className={estilos.variavel} aria-labelledby="titulo-variavel">
            <h2 id="titulo-variavel" className={estilos.titulo}>
              Itens com valor do caixa
            </h2>
            <p className={estilos.texto}>
              Estes itens foram pegos sem preço. Some o valor deles no cupom e informe abaixo.
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
              onChange={(e) => setVariavel(e.target.value)}
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
            onClick={() => finalizar.mutate()}
          >
            Concluir compra
          </Botao>
        </div>
      </Modal>
    </div>
  );
}
