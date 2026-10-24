import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/cliente';
import { itensApi } from '../api/endpoints';
import type { Categoria, Item, ListaDetalhe, SugestaoItem, TipoPreco } from '../api/tipos';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Card } from '../components/Card';
import { EstadoVazio } from '../components/Estados';
import form from '../components/Formulario.module.css';
import { IconeEditar, IconeLista, IconeMais } from '../components/Icones';
import { Modal } from '../components/Modal';
import { SeletorCategoria } from '../components/SeletorCategoria';
import { SeletorMedida } from '../components/SeletorMedida';
import { SeletorQuantidade } from '../components/SeletorQuantidade';
import {
  agruparPorCategoria,
  formatarQuantidade,
  lerDecimal,
  paraCampo,
  passoDaMedida,
  rotuloMedida,
} from '../util/compra';
import {
  antesDeAlterar,
  apagarItem,
  depoisDeAlterar,
  ehDesatualizado,
  gravarItem,
  mensagemDesatualizado,
} from './cacheLista';
import estilos from './ListaPagina.module.css';
import { useSugestaoItem } from './useSugestaoItem';

/** Aba Planejar: cadastrar o que comprar, com categoria, medida e quantidade desejada. */
export function ListaPlanejar({
  lista,
  aoDesatualizado,
}: {
  lista: ListaDetalhe;
  /** Alteração recusada porque outra pessoa mudou ou removeu o item antes. */
  aoDesatualizado: (mensagem: string) => void;
}) {
  const [editando, setEditando] = useState<Item | null>(null);
  const grupos = agruparPorCategoria(lista.categorias, lista.itens, 'planejar');

  return (
    <>
      <FormularioItem lista={lista} />

      {grupos.length === 0 ? (
        <EstadoVazio icone={<IconeLista />} titulo="Nenhum item planejado">
          Adicione acima o que precisa comprar. Na aba Comprar, no mercado, você marca o que pegou.
        </EstadoVazio>
      ) : (
        <div className={estilos.grupos}>
          {grupos.map(({ categoria, itens }) => (
            <section
              key={categoria.id}
              className={estilos.grupo}
              aria-labelledby={`plan-cat-${categoria.id}`}
            >
              <h2 id={`plan-cat-${categoria.id}`} className={estilos.grupoTitulo}>
                {categoria.nome}
                <span className={estilos.grupoContagem}>{itens.length}</span>
              </h2>
              <ul className={estilos.itens}>
                {itens.map((item) => (
                  <li key={item.id} className={estilos.item}>
                    <div className={estilos.planejado}>
                      <span className={estilos.itemNome}>{item.nome}</span>
                      <span className={estilos.itemDetalhe}>
                        {item.quantidadePlanejada !== null
                          ? formatarQuantidade(item.quantidadePlanejada, item.medida)
                          : rotuloMedida(item.medida)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={estilos.editar}
                      aria-label={`Editar ${item.nome}`}
                      onClick={() => setEditando(item)}
                    >
                      <IconeEditar tamanho={20} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className={estilos.rodapeAba}>
        A ordem das categorias segue a configuração da família.{' '}
        <Link to={`/familias/${lista.familiaId}/categorias?lista=${lista.id}&aba=planejar`}>
          Gerenciar categorias
        </Link>
      </p>

      {editando && (
        <ModalEditarItem
          item={editando}
          categorias={lista.categorias}
          aoFechar={() => setEditando(null)}
          aoDesatualizado={aoDesatualizado}
        />
      )}
    </>
  );
}

/** Quantidade digitada: vazio é "sem quantidade"; inválido ou zero, undefined. */
function lerQuantidade(texto: string): number | null | undefined {
  if (!texto.trim()) return null;
  const valor = lerDecimal(texto);
  return valor !== undefined && valor > 0 ? valor : undefined;
}

const ERRO_QUANTIDADE = 'Informe um número maior que zero.';

function FormularioItem({ lista }: { lista: ListaDetalhe }) {
  const queryClient = useQueryClient();
  const ultimo = lista.itens.at(-1);
  const [nome, setNome] = useState('');
  // Começa em 1 unidade; por kg, em 100 g. Os botões − e + andam nesse passo.
  const [medida, setMedida] = useState<TipoPreco>('UNIDADE');
  const [quantidade, setQuantidade] = useState(paraCampo(passoDaMedida('UNIDADE')));
  // Começa na categoria do último item adicionado: costuma-se planejar por seção do mercado
  const [categoriaId, setCategoriaId] = useState(
    ultimo?.categoriaId ?? lista.categorias[0]?.id ?? 0,
  );
  const qtd = lerQuantidade(quantidade);

  // Digitado o nome, categoria e medida vêm sugeridas (histórico, dicionário ou IA). O que a pessoa
  // já escolheu à mão para este item não é trocado.
  const [escolheuCategoria, setEscolheuCategoria] = useState(false);
  const [escolheuMedida, setEscolheuMedida] = useState(false);
  const sugestao = useSugestaoItem(lista.familiaId, nome);
  const [aplicada, setAplicada] = useState<SugestaoItem>();
  if (sugestao && sugestao.origem !== 'PADRAO' && sugestao !== aplicada) {
    setAplicada(sugestao);
    if (!escolheuCategoria) setCategoriaId(sugestao.categoriaId);
    if (!escolheuMedida && sugestao.medida !== medida) escolherMedida(sugestao.medida);
  }

  const adicionar = useMutation({
    mutationFn: (quantidadePlanejada: number | undefined) =>
      itensApi.adicionar(lista.id, { nome: nome.trim(), categoriaId, quantidadePlanejada, medida }),
    onMutate: () => antesDeAlterar(queryClient, lista.id),
    onSettled: () => depoisDeAlterar(queryClient, lista.id),
    onSuccess: (item) => {
      gravarItem(queryClient, item);
      setNome('');
      escolherMedida('UNIDADE');
      setEscolheuCategoria(false);
      setEscolheuMedida(false);
      setAplicada(undefined);
    },
  });
  const erro = adicionar.error instanceof ApiError ? adicionar.error : undefined;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!nome.trim() || qtd === undefined) return;
    adicionar.mutate(qtd ?? undefined);
  }

  /** Trocar a medida volta a quantidade para o início dela (1 unidade ou 100 g). */
  function escolherMedida(nova: TipoPreco) {
    setMedida(nova);
    setQuantidade(paraCampo(passoDaMedida(nova)));
  }

  return (
    <Card>
      <form className={estilos.formItem} onSubmit={enviar}>
        <Campo
          rotulo="Item"
          placeholder="Ex.: Arroz"
          maxLength={120}
          autoComplete="off"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          dica={
            aplicada && nome.trim()
              ? 'Categoria e medida preenchidas pelo nome. Confira antes de adicionar.'
              : undefined
          }
          erro={
            erro?.erroDoCampo('nome') ??
            (erro && erro.erros.length === 0 ? erro.message : undefined)
          }
        />
        <SeletorCategoria
          categorias={lista.categorias}
          valor={categoriaId}
          aoMudar={(id) => {
            setCategoriaId(id);
            setEscolheuCategoria(true);
          }}
          erro={erro?.erroDoCampo('categoriaId')}
        />
        <SeletorMedida
          valor={medida}
          aoMudar={(nova) => {
            escolherMedida(nova);
            setEscolheuMedida(true);
          }}
          erro={erro?.erroDoCampo('medida')}
        />
        <SeletorQuantidade
          rotulo={medida === 'KG' ? 'Peso' : 'Quantidade'}
          medida={medida}
          texto={quantidade}
          aoMudar={setQuantidade}
          erro={qtd === undefined ? ERRO_QUANTIDADE : erro?.erroDoCampo('quantidadePlanejada')}
        />
        <Botao
          type="submit"
          variante="primario"
          carregando={adicionar.isPending}
          disabled={!nome.trim() || qtd === undefined}
        >
          <IconeMais tamanho={20} />
          Adicionar
        </Botao>
      </form>
    </Card>
  );
}

function ModalEditarItem({
  item,
  categorias,
  aoFechar,
  aoDesatualizado,
}: {
  item: Item;
  categorias: Categoria[];
  aoFechar: () => void;
  aoDesatualizado: (mensagem: string) => void;
}) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(item.nome);
  const [categoriaId, setCategoriaId] = useState(item.categoriaId);
  const [quantidade, setQuantidade] = useState(paraCampo(item.quantidadePlanejada));
  const [medida, setMedida] = useState<TipoPreco>(item.medida);
  const qtd = lerQuantidade(quantidade);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  /** Outra pessoa alterou ou removeu o item depois que o formulário abriu: nada foi gravado. */
  function aoErro(erro: unknown) {
    if (!ehDesatualizado(erro)) return;
    aoFechar();
    aoDesatualizado(mensagemDesatualizado(erro));
  }

  const salvar = useMutation({
    mutationFn: () =>
      itensApi.atualizar(item.id, item.versao, {
        nome: nome.trim(),
        categoriaId,
        quantidadePlanejada: qtd ?? undefined,
        medida,
      }),
    onMutate: () => antesDeAlterar(queryClient, item.listaId),
    onSuccess: (atualizado) => {
      gravarItem(queryClient, atualizado);
      aoFechar();
    },
    onError: aoErro,
    onSettled: () => depoisDeAlterar(queryClient, item.listaId),
  });
  const remover = useMutation({
    mutationFn: () => itensApi.remover(item.id, item.versao),
    onMutate: () => antesDeAlterar(queryClient, item.listaId),
    onSuccess: () => {
      apagarItem(queryClient, item.listaId, item.id);
      aoFechar();
    },
    onError: aoErro,
    onSettled: () => depoisDeAlterar(queryClient, item.listaId),
  });
  const erro = salvar.error instanceof ApiError ? salvar.error : undefined;
  const erroGeral = (salvar.error ?? remover.error) as unknown;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nome.trim() && qtd !== undefined) salvar.mutate();
  }

  /** Trocar a medida volta a quantidade para o início dela (1 unidade ou 100 g). */
  function escolherMedida(nova: TipoPreco) {
    setMedida(nova);
    setQuantidade(paraCampo(passoDaMedida(nova)));
  }

  return (
    <Modal aberto titulo="Editar item" aoFechar={aoFechar}>
      <form className={form.formulario} onSubmit={enviar}>
        <Campo
          rotulo="Item"
          required
          maxLength={120}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erro?.erroDoCampo('nome')}
        />
        <SeletorCategoria
          categorias={categorias}
          valor={categoriaId}
          aoMudar={setCategoriaId}
          erro={erro?.erroDoCampo('categoriaId')}
        />
        <SeletorMedida valor={medida} aoMudar={escolherMedida} erro={erro?.erroDoCampo('medida')} />
        <SeletorQuantidade
          rotulo={medida === 'KG' ? 'Peso' : 'Quantidade'}
          medida={medida}
          texto={quantidade}
          aoMudar={setQuantidade}
          erro={qtd === undefined ? ERRO_QUANTIDADE : erro?.erroDoCampo('quantidadePlanejada')}
        />
        {erroGeral instanceof ApiError && erroGeral.erros.length === 0 && (
          <p className={form.erro} role="alert">
            {erroGeral.message}
          </p>
        )}
        <div className={estilos.acoesModal}>
          <Botao
            variante="perigo"
            carregando={remover.isPending}
            onClick={() => (confirmandoRemocao ? remover.mutate() : setConfirmandoRemocao(true))}
          >
            {confirmandoRemocao ? 'Confirmar remoção' : 'Remover'}
          </Botao>
          <div className={form.acoes}>
            <Botao variante="fantasma" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao
              type="submit"
              variante="primario"
              carregando={salvar.isPending}
              disabled={!nome.trim() || qtd === undefined}
            >
              Salvar
            </Botao>
          </div>
        </div>
      </form>
    </Modal>
  );
}
