import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/cliente';
import { familiasApi, listasApi } from '../api/endpoints';
import { Abas } from '../components/Abas';
import { Botao, LinkBotao } from '../components/Botao';
import { CabecalhoPagina } from '../components/CabecalhoPagina';
import { ConfirmarDialogo } from '../components/ConfirmarDialogo';
import { Carregando, EstadoVazio, MensagemErro } from '../components/Estados';
import { IconeCarrinho, IconeOpcoes } from '../components/Icones';
import { Modal } from '../components/Modal';
import { ModalNome } from '../components/ModalNome';
import { chaves } from '../estado/chaves';
import { ListaComprar } from './ListaComprar';
import estilos from './ListaPagina.module.css';
import { ListaPlanejar } from './ListaPlanejar';
import paginas from './Paginas.module.css';

const mensagemDe = (erro: unknown) => (erro instanceof ApiError ? erro.message : undefined);

/**
 * Tela da lista, em duas etapas separadas por abas (cada uma com endereço próprio):
 * - Planejar: em casa, cadastrar os itens por categoria.
 * - Comprar: no mercado, marcar o que foi pego, com quantidade, preço e marca.
 */
export function ListaPagina() {
  const { listaId: parametro, aba } = useParams();
  const listaId = Number(parametro);
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const [opcoesAbertas, setOpcoesAbertas] = useState(false);
  const [renomeando, setRenomeando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const lista = useQuery({
    queryKey: chaves.lista(listaId),
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

  const renomear = useMutation({
    mutationFn: (nome: string) => listasApi.renomear(listaId, nome),
    onSuccess: () => {
      setRenomeando(false);
      void queryClient.invalidateQueries({ queryKey: chaves.lista(listaId) });
      void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
    },
  });

  const excluir = useMutation({
    mutationFn: () => listasApi.excluir(listaId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: chaves.lista(listaId) });
      void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
      navegar(familiaIdDaLista ? `/familias/${familiaIdDaLista}` : '/familias');
    },
  });

  if (aba !== 'planejar' && aba !== 'comprar') {
    return <Navigate to={`/listas/${parametro}/planejar`} replace />;
  }
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

  return (
    <div className={[paginas.pagina, paginas.estreita].join(' ')}>
      <CabecalhoPagina
        trilha={[{ rotulo: familia.data?.nome ?? 'Listas', para: `/familias/${dados.familiaId}` }]}
        rotulo="Lista de compras"
        titulo={dados.nome}
        acoes={
          <Botao pequeno onClick={() => setOpcoesAbertas(true)}>
            <IconeOpcoes tamanho={18} />
            Opções
          </Botao>
        }
      />

      <Abas
        rotulo="Etapas da lista"
        abas={[
          { rotulo: 'Planejar', para: `/listas/${listaId}/planejar` },
          { rotulo: 'Comprar', para: `/listas/${listaId}/comprar` },
        ]}
      />

      {aba === 'planejar' ? <ListaPlanejar lista={dados} /> : <ListaComprar lista={dados} />}

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
          <LinkBotao
            larguraTotal
            to={`/familias/${dados.familiaId}/categorias?lista=${listaId}&aba=${aba}`}
          >
            Gerenciar categorias
          </LinkBotao>
          <Botao
            larguraTotal
            variante="perigo"
            onClick={() => {
              setOpcoesAbertas(false);
              setExcluindo(true);
            }}
          >
            Excluir lista
          </Botao>
        </div>
      </Modal>

      <ModalNome
        aberto={renomeando}
        titulo="Renomear lista"
        rotulo="Nome da lista"
        valorInicial={dados.nome}
        carregando={renomear.isPending}
        erro={mensagemDe(renomear.error)}
        aoSalvar={(nome) => renomear.mutate(nome)}
        aoFechar={() => {
          setRenomeando(false);
          renomear.reset();
        }}
      />

      <ConfirmarDialogo
        aberto={excluindo}
        titulo="Excluir lista?"
        mensagem={`A lista “${dados.nome}” e todos os itens planejados serão excluídos. As compras já concluídas continuam no histórico.`}
        textoConfirmar="Excluir"
        carregando={excluir.isPending}
        erro={mensagemDe(excluir.error)}
        aoConfirmar={() => excluir.mutate()}
        aoCancelar={() => setExcluindo(false)}
      />
    </div>
  );
}
