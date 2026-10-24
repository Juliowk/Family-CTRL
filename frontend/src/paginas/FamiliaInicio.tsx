import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../api/cliente';
import { comprasApi, listasApi } from '../api/endpoints';
import { Botao } from '../components/Botao';
import { CabecalhoPagina } from '../components/CabecalhoPagina';
import { Carregando } from '../components/Estados';
import { IconeCarrinho, IconeMais, IconeSeta, IconeVoltar } from '../components/Icones';
import { Indicadores } from '../components/Indicadores';
import { ModalNome } from '../components/ModalNome';
import { Selo } from '../components/Selo';
import { chaves } from '../estado/chaves';
import { dataEMercado, mesAtual } from '../util/compra';
import cartoes from './Cartoes.module.css';
import { ErroFamilia } from './FamiliaNaoEncontrada';
import estilos from './FamiliaInicio.module.css';
import { FuncionalidadeListas } from './FuncionalidadeListas';
import paginas from './Paginas.module.css';
import { PARAMETRO_FUNCIONALIDADE, type Funcionalidade } from './rotasFamilia';
import { useFamiliaDaRota } from './useFamiliaDaRota';

interface Cartao {
  id: Funcionalidade;
  titulo: string;
  descricao: string;
  icone: ReactNode;
}

/** Funcionalidades disponíveis, na ordem dos cards. Novas funcionalidades entram aqui. */
const FUNCIONALIDADES: Cartao[] = [
  {
    id: 'listas',
    titulo: 'Listas de compras',
    descricao: 'Planeje em casa, marque no mercado e acompanhe os gastos.',
    icone: <IconeCarrinho />,
  },
];

function lerFuncionalidade(valor: string | null): Funcionalidade | null {
  return FUNCIONALIDADES.find((f) => f.id === valor)?.id ?? null;
}

/**
 * Tela inicial da família ("ctrl"): "Criar lista" logo no topo (a ação mais comum), resumo do mês e
 * os cards das funcionalidades. Escolher um card troca a seção dos cards pela funcionalidade, na
 * mesma página (sem recarregar nem mudar de rota).
 */
export function FamiliaInicio() {
  const { familiaId, familia } = useFamiliaDaRota();
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const [criandoLista, setCriandoLista] = useState(false);
  const [parametros, setParametros] = useSearchParams();
  const aberta = lerFuncionalidade(parametros.get(PARAMETRO_FUNCIONALIDADE));
  const mes = mesAtual();
  const troca = useRef<HTMLDivElement>(null);
  // Só move o foco quando a troca vem de um clique, não ao chegar na página
  const trocouAgora = useRef(false);

  const criarLista = useMutation({
    mutationFn: (nome: string) => listasApi.criar(familiaId, nome),
    onSuccess: (lista) => {
      void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
      navegar(`/listas/${lista.id}/planejar`);
    },
  });

  const resumo = useQuery({
    queryKey: chaves.resumo(familiaId, mes),
    queryFn: () => comprasApi.resumo(familiaId, mes),
    enabled: familia.isSuccess,
  });

  useEffect(() => {
    if (!trocouAgora.current) return;
    trocouAgora.current = false;
    // Leva o foco ao título da seção nova (leitores de tela e teclado acompanham a troca)
    troca.current?.querySelector<HTMLElement>('h2[tabindex="-1"]')?.focus();
  }, [aberta]);

  function abrir(funcionalidade: Funcionalidade | null) {
    trocouAgora.current = true;
    setParametros(funcionalidade ? { [PARAMETRO_FUNCIONALIDADE]: funcionalidade } : {});
  }

  if (familia.isPending) return <Carregando />;
  if (familia.isError) {
    return <ErroFamilia erro={familia.error} aoTentarDeNovo={() => void familia.refetch()} />;
  }

  const ultima = resumo.data?.ultimaCompra;

  return (
    <div className={paginas.pagina}>
      <CabecalhoPagina
        trilha={[{ rotulo: 'Famílias', para: '/familias' }]}
        rotulo="Família"
        titulo={familia.data.nome}
        descricao="Tudo o que a família organiza junta, em um só lugar."
        acoes={
          <Botao variante="primario" onClick={() => setCriandoLista(true)}>
            <IconeMais tamanho={20} />
            Criar lista
          </Botao>
        }
      />

      <ModalNome
        aberto={criandoLista}
        titulo="Nova lista"
        rotulo="Nome da lista"
        valorInicial=""
        textoSalvar="Criar lista"
        carregando={criarLista.isPending}
        erro={criarLista.error instanceof ApiError ? criarLista.error.message : undefined}
        aoSalvar={(nome) => criarLista.mutate(nome)}
        aoFechar={() => {
          setCriandoLista(false);
          criarLista.reset();
        }}
      />

      <Indicadores
        rotulo="Resumo do mês"
        itens={[
          { rotulo: 'Gasto no mês', valor: resumo.data?.gasto, dinheiro: true, destaque: true },
          { rotulo: 'Compras no mês', valor: resumo.data?.compras },
          {
            rotulo: 'Última compra',
            valor: resumo.isPending ? undefined : ultima ? dataEMercado(ultima) : 'Nenhuma ainda',
          },
        ]}
      />

      <div ref={troca} key={aberta ?? 'cards'} className={estilos.troca}>
        {aberta === 'listas' ? (
          <>
            <Botao
              variante="fantasma"
              pequeno
              className={estilos.voltar}
              onClick={() => abrir(null)}
            >
              <IconeVoltar tamanho={20} />
              Funcionalidades
            </Botao>
            <FuncionalidadeListas familiaId={familiaId} />
          </>
        ) : (
          <CartoesDeFuncionalidades familiaId={familiaId} aoAbrir={abrir} />
        )}
      </div>
    </div>
  );
}

function CartoesDeFuncionalidades({
  familiaId,
  aoAbrir,
}: {
  familiaId: number;
  aoAbrir: (funcionalidade: Funcionalidade) => void;
}) {
  // Mesmo cache da funcionalidade de listas: abrir o card não gera outra requisição
  const listas = useQuery({
    queryKey: chaves.listas(familiaId),
    queryFn: () => listasApi.listar(familiaId),
  });

  const selos: Record<Funcionalidade, ReactNode> = {
    listas: listas.data && (
      <Selo>
        {listas.data.length} {listas.data.length === 1 ? 'lista' : 'listas'}
      </Selo>
    ),
  };

  return (
    <section className={paginas.secao} aria-labelledby="titulo-funcionalidades">
      <h2 id="titulo-funcionalidades" className={paginas.secaoTitulo} tabIndex={-1}>
        Funcionalidades
      </h2>
      <ul className={paginas.grade}>
        {FUNCIONALIDADES.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              className={[cartoes.cartao, estilos.funcionalidade].join(' ')}
              onClick={() => aoAbrir(f.id)}
            >
              <span className={cartoes.cartaoTopo}>
                <span className={cartoes.cartaoIdentidade}>
                  <span className={estilos.icone} aria-hidden="true">
                    {f.icone}
                  </span>
                  <span className={cartoes.cartaoTitulo}>{f.titulo}</span>
                </span>
                <span className={cartoes.cartaoSeta}>
                  <IconeSeta tamanho={20} />
                </span>
              </span>
              <span className={estilos.descricao}>{f.descricao}</span>
              {selos[f.id] && <span className={cartoes.cartaoSelos}>{selos[f.id]}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
