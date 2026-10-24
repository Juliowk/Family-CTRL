import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '../api/cliente';
import { itensApi } from '../api/endpoints';
import type { Item, ListaDetalhe } from '../api/tipos';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { ConfirmarDialogo } from '../components/ConfirmarDialogo';
import { EstadoVazio } from '../components/Estados';
import form from '../components/Formulario.module.css';
import { IconeCarrinho, IconeCheck, IconeMais } from '../components/Icones';
import { Selo } from '../components/Selo';
import { chaves } from '../estado/chaves';
import {
  agruparPorCategoria,
  descreverPego,
  formatarDinheiro,
  formatarQuantidade,
  subtotal,
  totalDaCompra,
} from '../util/compra';
import { normalizar } from '../util/csvLista';
import {
  antesDeAlterar,
  depoisDeAlterar,
  ehDesatualizado,
  gravarItem,
  mensagemDesatualizado,
} from './cacheLista';
import estilos from './ListaPagina.module.css';
import { ModalPegar } from './ModalPegar';

/** Formulário aberto: um item (pegar/corrigir) ou um item não planejado, com o nome digitado. */
type Formulario = { item: Item } | { extra: string } | null;

/**
 * Aba Comprar: no mercado, marcar o que foi pego e acompanhar o total. No topo, "O que você
 * pegou?": digitar o nome abre o painel curto (quantidade e preço) de um item da lista com esse
 * nome ou, se não houver, de um item não planejado. Funciona igual numa lista sem planejamento.
 */
export function ListaComprar({
  lista,
  aoDesatualizado,
}: {
  lista: ListaDetalhe;
  /** Alteração recusada porque outra pessoa mudou o item ou a lista antes. */
  aoDesatualizado: (mensagem: string) => void;
}) {
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [pegou, setPegou] = useState('');
  const [confirmandoDesmarcar, setConfirmandoDesmarcar] = useState(false);
  const [erroDesmarcar, setErroDesmarcar] = useState<string>();

  const grupos = agruparPorCategoria(lista.categorias, lista.itens, 'comprar');
  const pegos = lista.itens.filter((i) => i.pego).length;
  const { total, semValor } = totalDaCompra(lista.itens);

  /** Desmarcar um item: otimista (a tela muda na hora; se a API falhar, volta). */
  const desmarcar = useMutation({
    mutationFn: (item: Item) => itensApi.desmarcar(item.id, item.versao),
    onMutate: async (item) => {
      setErroDesmarcar(undefined);
      await antesDeAlterar(queryClient, lista.id);
      const anterior = queryClient.getQueryData<ListaDetalhe>(chaves.lista(lista.id));
      gravarItem(queryClient, {
        ...item,
        pego: false,
        pegoEm: null,
        pegoPor: null,
        quantidadePega: null,
        tipoPreco: 'UNIDADE',
        preco: null,
        subtotal: null,
        marca: null,
      });
      return { anterior };
    },
    onError: (erro, _item, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(chaves.lista(lista.id), contexto.anterior);
      if (ehDesatualizado(erro)) aoDesatualizado(mensagemDesatualizado(erro));
      else setErroDesmarcar('Não foi possível desmarcar o item. Tente de novo.');
    },
    onSuccess: (salvo) => gravarItem(queryClient, salvo),
    onSettled: () => depoisDeAlterar(queryClient, lista.id),
  });

  // Com a versão da lista: se alguém marcou algo depois que a tela mostrou a contagem, é recusado
  const desmarcarTodos = useMutation({
    mutationFn: () => itensApi.desmarcarTodos(lista.id, lista.versao),
    onMutate: () => antesDeAlterar(queryClient, lista.id),
    onSuccess: () => setConfirmandoDesmarcar(false),
    onError: (erro) => {
      if (!ehDesatualizado(erro)) return;
      setConfirmandoDesmarcar(false);
      aoDesatualizado(erro.message);
    },
    onSettled: () => depoisDeAlterar(queryClient, lista.id),
  });

  /** Item da lista ainda não pego com o nome digitado; senão, entra como não planejado. */
  function abrirPegou(evento: FormEvent) {
    evento.preventDefault();
    const nome = pegou.trim();
    if (!nome) return;
    const planejado = lista.itens.find((i) => !i.pego && normalizar(i.nome) === normalizar(nome));
    setFormulario(planejado ? { item: planejado } : { extra: nome });
    setPegou('');
  }

  const campoPegou = (
    <form className={estilos.pegarRapido} onSubmit={abrirPegou}>
      <Campo
        rotulo="O que você pegou?"
        placeholder="Ex.: Mussarela"
        maxLength={120}
        autoComplete="off"
        enterKeyHint="go"
        value={pegou}
        onChange={(e) => setPegou(e.target.value)}
      />
      <Botao type="submit" disabled={!pegou.trim()}>
        <IconeMais tamanho={20} />
        Adicionar
      </Botao>
    </form>
  );

  const painel = formulario && (
    <ModalPegar
      listaId={lista.id}
      categorias={lista.categorias}
      item={'item' in formulario ? formulario.item : undefined}
      nomeExtra={'extra' in formulario ? formulario.extra : undefined}
      aoFechar={() => setFormulario(null)}
      aoDesatualizado={aoDesatualizado}
    />
  );

  if (lista.itens.length === 0) {
    return (
      <>
        {campoPegou}
        <EstadoVazio icone={<IconeCarrinho />} titulo="Lista vazia">
          Sem planejar? Tudo bem: digite acima o que você pegou e informe o preço. O total vai
          somando aqui.
        </EstadoVazio>
        {painel}
      </>
    );
  }

  return (
    <>
      {campoPegou}

      <div className={estilos.ferramentas}>
        <Botao
          pequeno
          variante="fantasma"
          className={estilos.desmarcarTodos}
          disabled={pegos === 0}
          onClick={() => setConfirmandoDesmarcar(true)}
        >
          Desmarcar todos
        </Botao>
      </div>

      {erroDesmarcar && (
        <p className={form.erro} role="alert">
          {erroDesmarcar}
        </p>
      )}

      <div className={estilos.grupos}>
        {grupos.map(({ categoria, itens }) => (
          <section
            key={categoria.id}
            className={estilos.grupo}
            aria-labelledby={`comp-cat-${categoria.id}`}
          >
            <h2 id={`comp-cat-${categoria.id}`} className={estilos.grupoTitulo}>
              {categoria.nome}
            </h2>
            <ul className={estilos.itens} aria-label={`Itens de ${categoria.nome}`}>
              {itens.map((item) => (
                <LinhaCompra
                  key={item.id}
                  item={item}
                  aoAbrir={() => setFormulario({ item })}
                  aoDesmarcar={() => desmarcar.mutate(item)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className={estilos.barraTotal} role="region" aria-label="Total da compra">
        <div className={estilos.barraTotalTextos}>
          <span className={estilos.barraTotalRotulo}>Total parcial</span>
          <strong className={estilos.barraTotalValor} aria-live="polite">
            {formatarDinheiro(total)}
          </strong>
          {semValor > 0 && (
            <span className={estilos.barraTotalAviso}>
              + {semValor} {semValor === 1 ? 'item sem preço' : 'itens sem preço'}
            </span>
          )}
        </div>
        <Botao
          variante="primario"
          disabled={pegos === 0}
          onClick={() => navegar(`/listas/${lista.id}/finalizar`)}
        >
          Finalizar compra
        </Botao>
      </div>

      {painel}

      <ConfirmarDialogo
        aberto={confirmandoDesmarcar}
        titulo="Desmarcar todos os itens?"
        mensagem={`${pegos} ${pegos === 1 ? 'item marcado volta' : 'itens marcados voltam'} a ficar pendente${pegos === 1 ? '' : 's'}, e as quantidades, preços e marcas informados nesta compra serão apagados. Os itens planejados continuam na lista.`}
        textoConfirmar="Desmarcar todos"
        carregando={desmarcarTodos.isPending}
        erro={desmarcarTodos.error instanceof ApiError ? desmarcarTodos.error.message : undefined}
        aoConfirmar={() => desmarcarTodos.mutate()}
        aoCancelar={() => setConfirmandoDesmarcar(false)}
      />
    </>
  );
}

function LinhaCompra({
  item,
  aoAbrir,
  aoDesmarcar,
}: {
  item: Item;
  aoAbrir: () => void;
  aoDesmarcar: () => void;
}) {
  const valor = item.pego ? subtotal(item.tipoPreco, item.preco, item.quantidadePega) : undefined;
  const detalhe = item.pego
    ? descreverPego(item)
    : item.quantidadePlanejada !== null
      ? formatarQuantidade(item.quantidadePlanejada, item.medida)
      : null;
  return (
    <li className={estilos.item} data-pego={item.pego}>
      {/* Pendente: o checkbox abre o formulário (marca ao confirmar). Pego: desmarca. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={item.pego}
        aria-label={item.pego ? `Desmarcar ${item.nome}` : `Pegar ${item.nome}`}
        className={estilos.checkbox}
        onClick={item.pego ? aoDesmarcar : aoAbrir}
      >
        <span className={estilos.caixa} aria-hidden="true">
          {item.pego && <IconeCheck tamanho={16} />}
        </span>
      </button>
      <button
        type="button"
        className={estilos.conteudo}
        onClick={aoAbrir}
        aria-label={`${item.pego ? 'Editar valores de' : 'Pegar'} ${item.nome}`}
      >
        <span className={estilos.texto}>
          <span className={estilos.itemNome}>{item.nome}</span>
          {detalhe && <span className={estilos.itemDetalhe}>{detalhe}</span>}
        </span>
        {item.pego &&
          (valor !== undefined ? (
            <span className={estilos.valor}>{formatarDinheiro(valor)}</span>
          ) : (
            <Selo tom="atencao">no caixa</Selo>
          ))}
      </button>
    </li>
  );
}
