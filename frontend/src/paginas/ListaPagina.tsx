import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/cliente';
import { familiasApi, itensApi, listasApi, type DadosItem } from '../api/endpoints';
import type { Item, ListaDetalhe } from '../api/tipos';
import { Botao, LinkBotao } from '../components/Botao';
import { CabecalhoPagina } from '../components/CabecalhoPagina';
import { Campo } from '../components/Campo';
import { Card } from '../components/Card';
import { ConfirmarDialogo } from '../components/ConfirmarDialogo';
import { Carregando, EstadoVazio, MensagemErro } from '../components/Estados';
import form from '../components/Formulario.module.css';
import {
  IconeCarrinho,
  IconeCheck,
  IconeEditar,
  IconeMais,
  IconeOpcoes,
} from '../components/Icones';
import { Modal } from '../components/Modal';
import { ModalNome } from '../components/ModalNome';
import { Progresso } from '../components/Progresso';
import { Selo } from '../components/Selo';
import { useAuth } from '../estado/auth';
import { chaves } from '../estado/chaves';
import estilos from './ListaPagina.module.css';
import paginas from './Paginas.module.css';

const CHAVE_ALTERNAR = ['alternar-item'];

const mensagemDe = (erro: unknown) => (erro instanceof ApiError ? erro.message : undefined);

/** Pendentes primeiro; dentro de cada grupo mantém a ordem vinda da API. */
function ordenar(itens: Item[]): Item[] {
  return [...itens].sort((a, b) => Number(a.comprado) - Number(b.comprado));
}

/** Tela da lista: a principal do app, pensada para uso com uma mão no supermercado. */
export function ListaPagina() {
  const { listaId: parametro } = useParams();
  const listaId = Number(parametro);
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const chaveLista = chaves.lista(listaId);

  const lista = useQuery({
    queryKey: chaveLista,
    queryFn: () => listasApi.detalhar(listaId),
    enabled: Number.isFinite(listaId),
  });

  // Nome da família para o breadcrumb (normalmente já está no cache)
  const familiaIdDaLista = lista.data?.familiaId;
  const familia = useQuery({
    queryKey: chaves.familia(familiaIdDaLista ?? 0),
    queryFn: () => familiasApi.detalhar(familiaIdDaLista ?? 0),
    enabled: familiaIdDaLista !== undefined,
  });

  const [opcoesAbertas, setOpcoesAbertas] = useState(false);
  const [renomeando, setRenomeando] = useState(false);
  const [confirmar, setConfirmar] = useState<'excluir' | 'limpar' | null>(null);
  const [editando, setEditando] = useState<Item | null>(null);
  const [erroAlternar, setErroAlternar] = useState<string>();

  function recarregar() {
    void queryClient.invalidateQueries({ queryKey: chaveLista });
    void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
  }

  /**
   * Marcar/desmarcar com atualização otimista: a tela muda na hora e a API é chamada em
   * seguida. Se a chamada falhar, o estado anterior é restaurado.
   */
  const alternar = useMutation({
    mutationKey: CHAVE_ALTERNAR,
    mutationFn: (item: Item) => itensApi.atualizar(item.id, { comprado: !item.comprado }),
    onMutate: async (item) => {
      setErroAlternar(undefined);
      await queryClient.cancelQueries({ queryKey: chaveLista });
      const anterior = queryClient.getQueryData<ListaDetalhe>(chaveLista);
      queryClient.setQueryData<ListaDetalhe>(chaveLista, (atual) =>
        atual
          ? {
              ...atual,
              itens: atual.itens.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      comprado: !i.comprado,
                      compradoPor:
                        !i.comprado && usuario ? { id: usuario.id, nome: usuario.nome } : null,
                    }
                  : i,
              ),
            }
          : atual,
      );
      return { anterior };
    },
    onError: (_erro, _item, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(chaveLista, contexto.anterior);
      setErroAlternar('Não foi possível atualizar o item. Tente de novo.');
    },
    onSettled: () => {
      // Só recarrega quando não há outros toques em andamento (evita "piscar" a lista)
      if (queryClient.isMutating({ mutationKey: CHAVE_ALTERNAR }) <= 1) recarregar();
    },
  });

  const adicionar = useMutation({
    mutationFn: (dados: DadosItem) => itensApi.adicionar(listaId, dados),
    onSuccess: (item) => {
      queryClient.setQueryData<ListaDetalhe>(chaveLista, (atual) =>
        atual ? { ...atual, itens: [...atual.itens, item] } : atual,
      );
      recarregar();
    },
  });

  const atualizarLista = useMutation({
    mutationFn: (dados: { nome?: string; arquivada?: boolean }) =>
      listasApi.atualizar(listaId, dados),
    onSuccess: () => {
      setRenomeando(false);
      setOpcoesAbertas(false);
      recarregar();
    },
  });

  const excluir = useMutation({
    mutationFn: () => listasApi.excluir(listaId),
    onSuccess: () => {
      const familiaId = lista.data?.familiaId;
      queryClient.removeQueries({ queryKey: chaveLista });
      void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
      navegar(familiaId ? `/familias/${familiaId}` : '/familias');
    },
  });

  const limpar = useMutation({
    mutationFn: () => itensApi.limparComprados(listaId),
    onSuccess: () => {
      setConfirmar(null);
      recarregar();
    },
  });

  if (lista.isPending) return <Carregando linhas={5} />;
  if (lista.isError) {
    if (lista.error instanceof ApiError && lista.error.status === 404) {
      return (
        <EstadoVazio
          icone={<IconeCarrinho />}
          titulo="Lista não encontrada"
          acao={<LinkBotao to="/inicio">Voltar às listas</LinkBotao>}
        >
          Ela pode ter sido excluída ou você não participa mais da família dela.
        </EstadoVazio>
      );
    }
    return <MensagemErro erro={lista.error} aoTentarDeNovo={() => void lista.refetch()} />;
  }

  const dados = lista.data;
  const itens = ordenar(dados.itens);
  const comprados = itens.filter((i) => i.comprado).length;

  return (
    <div className={[paginas.pagina, paginas.estreita].join(' ')}>
      <CabecalhoPagina
        trilha={[{ rotulo: familia.data?.nome ?? 'Listas', para: `/familias/${dados.familiaId}` }]}
        rotulo="Lista de compras"
        titulo={dados.nome}
        selos={dados.arquivada && <Selo tom="atencao">Arquivada</Selo>}
        acoes={
          <Botao pequeno onClick={() => setOpcoesAbertas(true)}>
            <IconeOpcoes tamanho={18} />
            Opções
          </Botao>
        }
      />

      <Card className={estilos.resumo}>
        <Progresso comprados={comprados} total={itens.length} />
        <FormularioItem
          carregando={adicionar.isPending}
          erro={adicionar.error instanceof ApiError ? adicionar.error : undefined}
          aoAdicionar={(item, limparCampos) =>
            adicionar.mutate(item, { onSuccess: () => limparCampos() })
          }
        />
      </Card>

      {erroAlternar && (
        <p className={form.erro} role="alert">
          {erroAlternar}
        </p>
      )}

      {itens.length === 0 ? (
        <EstadoVazio icone={<IconeCarrinho />} titulo="Nenhum item ainda">
          Adicione o primeiro item acima. Quantidade e observação são opcionais.
        </EstadoVazio>
      ) : (
        <ul className={estilos.itens} aria-label="Itens da lista">
          {itens.map((item) => (
            <li key={item.id} className={estilos.item} data-comprado={item.comprado}>
              <button
                type="button"
                className={estilos.alternar}
                aria-pressed={item.comprado}
                onClick={() => alternar.mutate(item)}
              >
                <span className={estilos.marcador} aria-hidden="true">
                  {item.comprado && <IconeCheck tamanho={16} />}
                </span>
                <span className={estilos.itemTexto}>
                  <span className={estilos.itemNome}>
                    {item.nome}
                    {item.quantidade && (
                      <span className={estilos.itemQuantidade}> · {item.quantidade}</span>
                    )}
                  </span>
                  {item.observacao && (
                    <span className={estilos.itemDetalhe}>{item.observacao}</span>
                  )}
                  {item.comprado && item.compradoPor?.nome && (
                    <span className={estilos.itemDetalhe}>
                      Comprado por {item.compradoPor.nome}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                className={estilos.editar}
                aria-label={`Editar ${item.nome}`}
                onClick={() => setEditando(item)}
              >
                <IconeEditar tamanho={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {comprados > 0 && (
        <Botao
          variante="fantasma"
          className={estilos.limpar}
          onClick={() => setConfirmar('limpar')}
        >
          Limpar comprados ({comprados})
        </Botao>
      )}

      <Modal
        aberto={opcoesAbertas}
        titulo="Opções da lista"
        aoFechar={() => setOpcoesAbertas(false)}
      >
        <div className={estilos.opcoes}>
          <Botao
            larguraTotal
            onClick={() => {
              setOpcoesAbertas(false);
              setRenomeando(true);
            }}
          >
            Renomear
          </Botao>
          <Botao
            larguraTotal
            carregando={
              atualizarLista.isPending && atualizarLista.variables?.arquivada !== undefined
            }
            onClick={() => atualizarLista.mutate({ arquivada: !dados.arquivada })}
          >
            {dados.arquivada ? 'Desarquivar' : 'Arquivar'}
          </Botao>
          <Botao
            larguraTotal
            variante="perigo"
            onClick={() => {
              setOpcoesAbertas(false);
              setConfirmar('excluir');
            }}
          >
            Excluir lista
          </Botao>
          {atualizarLista.isError && (
            <p className={form.erro} role="alert">
              {mensagemDe(atualizarLista.error)}
            </p>
          )}
        </div>
      </Modal>

      <ModalNome
        aberto={renomeando}
        titulo="Renomear lista"
        rotulo="Nome da lista"
        valorInicial={dados.nome}
        carregando={atualizarLista.isPending}
        erro={mensagemDe(atualizarLista.error)}
        aoSalvar={(nome) => atualizarLista.mutate({ nome })}
        aoFechar={() => {
          setRenomeando(false);
          atualizarLista.reset();
        }}
      />

      <ConfirmarDialogo
        aberto={confirmar === 'excluir'}
        titulo="Excluir lista?"
        mensagem={`A lista “${dados.nome}” e todos os itens serão excluídos. Isso não pode ser desfeito.`}
        textoConfirmar="Excluir"
        carregando={excluir.isPending}
        erro={mensagemDe(excluir.error)}
        aoConfirmar={() => excluir.mutate()}
        aoCancelar={() => setConfirmar(null)}
      />

      <ConfirmarDialogo
        aberto={confirmar === 'limpar'}
        titulo="Limpar comprados?"
        mensagem={`${comprados} ${comprados === 1 ? 'item comprado será removido' : 'itens comprados serão removidos'} da lista.`}
        textoConfirmar="Limpar"
        carregando={limpar.isPending}
        erro={mensagemDe(limpar.error)}
        aoConfirmar={() => limpar.mutate()}
        aoCancelar={() => setConfirmar(null)}
      />

      {editando && (
        <ModalItem
          item={editando}
          aoFechar={() => setEditando(null)}
          aoAlterar={() => {
            setEditando(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}

function FormularioItem({
  carregando,
  erro,
  aoAdicionar,
}: {
  carregando: boolean;
  erro?: ApiError;
  aoAdicionar: (item: DadosItem, limparCampos: () => void) => void;
}) {
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [detalhes, setDetalhes] = useState(false);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!nome.trim()) return;
    aoAdicionar(
      {
        nome: nome.trim(),
        quantidade: quantidade.trim() || undefined,
        observacao: observacao.trim() || undefined,
      },
      () => {
        setNome('');
        setQuantidade('');
        setObservacao('');
      },
    );
  }

  return (
    <form className={estilos.novoItem} onSubmit={enviar}>
      <div className={form.linha}>
        <Campo
          rotulo="Novo item"
          rotuloOculto
          placeholder="Adicionar item"
          maxLength={120}
          autoComplete="off"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={
            erro?.erroDoCampo('nome') ??
            (erro && erro.erros.length === 0 ? erro.message : undefined)
          }
        />
        <Botao type="submit" variante="primario" carregando={carregando} disabled={!nome.trim()}>
          <IconeMais tamanho={18} />
          Adicionar
        </Botao>
      </div>
      {detalhes ? (
        <div className={estilos.detalhes}>
          <Campo
            rotulo="Quantidade (opcional)"
            placeholder="Ex.: 2 kg"
            maxLength={30}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            erro={erro?.erroDoCampo('quantidade')}
          />
          <Campo
            rotulo="Observação (opcional)"
            placeholder="Ex.: sem lactose"
            maxLength={255}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            erro={erro?.erroDoCampo('observacao')}
          />
        </div>
      ) : (
        <Botao
          variante="fantasma"
          pequeno
          className={estilos.maisDetalhes}
          onClick={() => setDetalhes(true)}
        >
          <IconeMais tamanho={16} />
          Quantidade e observação
        </Botao>
      )}
    </form>
  );
}

function ModalItem({
  item,
  aoFechar,
  aoAlterar,
}: {
  item: Item;
  aoFechar: () => void;
  aoAlterar: () => void;
}) {
  const [nome, setNome] = useState(item.nome);
  const [quantidade, setQuantidade] = useState(item.quantidade ?? '');
  const [observacao, setObservacao] = useState(item.observacao ?? '');
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  // String vazia apaga quantidade/observação no backend
  const salvar = useMutation({
    mutationFn: () =>
      itensApi.atualizar(item.id, {
        nome: nome.trim(),
        quantidade: quantidade.trim(),
        observacao: observacao.trim(),
      }),
    onSuccess: aoAlterar,
  });
  const remover = useMutation({
    mutationFn: () => itensApi.remover(item.id),
    onSuccess: aoAlterar,
  });
  const erro = salvar.error instanceof ApiError ? salvar.error : undefined;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nome.trim()) salvar.mutate();
  }

  return (
    <Modal aberto titulo="Editar item" aoFechar={aoFechar}>
      <form className={form.formulario} onSubmit={enviar}>
        <Campo
          rotulo="Nome"
          required
          maxLength={120}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erro?.erroDoCampo('nome')}
        />
        <Campo
          rotulo="Quantidade (opcional)"
          maxLength={30}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          erro={erro?.erroDoCampo('quantidade')}
        />
        <Campo
          rotulo="Observação (opcional)"
          maxLength={255}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          erro={erro?.erroDoCampo('observacao')}
        />
        {(salvar.isError || remover.isError) && (
          <p className={form.erro} role="alert">
            {mensagemDe(salvar.error ?? remover.error)}
          </p>
        )}
        <div className={estilos.acoesItem}>
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
              disabled={!nome.trim()}
            >
              Salvar
            </Botao>
          </div>
        </div>
      </form>
    </Modal>
  );
}
