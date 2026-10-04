import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../api/cliente';
import { listasApi } from '../api/endpoints';
import type { Lista } from '../api/tipos';
import { Botao } from '../components/Botao';
import { CabecalhoPagina } from '../components/CabecalhoPagina';
import { Campo } from '../components/Campo';
import { Card } from '../components/Card';
import { Carregando, EstadoVazio, MensagemErro } from '../components/Estados';
import { FiltroChips } from '../components/FiltroChips';
import form from '../components/Formulario.module.css';
import { IconeArquivo, IconeCarrinho, IconeSeta } from '../components/Icones';
import { Indicadores } from '../components/Indicadores';
import { Progresso } from '../components/Progresso';
import { Selo } from '../components/Selo';
import { chaves } from '../estado/chaves';
import cartoes from './Cartoes.module.css';
import { ErroFamilia } from './FamiliaNaoEncontrada';
import estilos from './Paginas.module.css';
import { useFamiliaDaRota } from './useFamiliaDaRota';

type Visao = 'ativas' | 'arquivadas';

/** Tela inicial da família: resumo, criação de lista e listas com o progresso. */
export function FamiliaListas() {
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const { familiaId, familia } = useFamiliaDaRota();
  // A visão fica na URL (?ver=arquivadas): recarregar ou compartilhar o link abre igual
  const [parametros, setParametros] = useSearchParams();
  const visao: Visao = parametros.get('ver') === 'arquivadas' ? 'arquivadas' : 'ativas';
  const [nome, setNome] = useState('');

  const ativas = useQuery({
    queryKey: chaves.listas(familiaId, false),
    queryFn: () => listasApi.listar(familiaId, false),
    enabled: familia.isSuccess,
  });

  const criar = useMutation({
    mutationFn: (nomeLista: string) => listasApi.criar(familiaId, nomeLista),
    onSuccess: (lista) => {
      setNome('');
      void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
      navegar(`/listas/${lista.id}`);
    },
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nome.trim()) criar.mutate(nome.trim());
  }

  function mudarVisao(nova: Visao) {
    setParametros(nova === 'arquivadas' ? { ver: 'arquivadas' } : {}, { replace: true });
  }

  if (familia.isPending) return <Carregando />;
  if (familia.isError) {
    return <ErroFamilia erro={familia.error} aoTentarDeNovo={() => void familia.refetch()} />;
  }

  const total = ativas.data?.reduce((soma, lista) => soma + lista.totalItens, 0);
  const comprados = ativas.data?.reduce((soma, lista) => soma + lista.itensComprados, 0);

  return (
    <div className={estilos.pagina}>
      <CabecalhoPagina
        trilha={[{ rotulo: 'Famílias', para: '/familias' }]}
        rotulo="Família"
        titulo={familia.data.nome}
        descricao="Listas de compras da família. Toque numa lista para marcar os itens."
      />

      <Indicadores
        rotulo="Resumo da família"
        itens={[
          {
            rotulo: 'Itens a comprar',
            valor: total !== undefined && comprados !== undefined ? total - comprados : undefined,
            destaque: true,
          },
          { rotulo: 'Comprados', valor: comprados },
          { rotulo: 'Listas ativas', valor: ativas.data?.length },
          { rotulo: 'Membros', valor: familia.data.membros.length },
        ]}
      />

      <Card>
        <form className={form.linha} onSubmit={enviar}>
          <Campo
            rotulo="Nome da nova lista"
            rotuloOculto
            placeholder="Nova lista (ex.: Mercado)"
            maxLength={100}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            erro={criar.error instanceof ApiError ? criar.error.message : undefined}
          />
          <Botao
            type="submit"
            variante="primario"
            carregando={criar.isPending}
            disabled={!nome.trim()}
          >
            Criar lista
          </Botao>
        </form>
      </Card>

      <section className={estilos.secao} aria-labelledby="titulo-listas">
        <div className={estilos.secaoCabecalho}>
          <h2 id="titulo-listas" className={estilos.secaoTitulo}>
            Listas
          </h2>
          <FiltroChips
            rotulo="Mostrar listas"
            valor={visao}
            aoMudar={mudarVisao}
            opcoes={[
              { valor: 'ativas', rotulo: 'Ativas' },
              { valor: 'arquivadas', rotulo: 'Arquivadas' },
            ]}
          />
        </div>

        {visao === 'arquivadas' ? (
          <ListasArquivadas familiaId={familiaId} />
        ) : ativas.isPending ? (
          <Carregando />
        ) : ativas.isError ? (
          <MensagemErro erro={ativas.error} aoTentarDeNovo={() => void ativas.refetch()} />
        ) : ativas.data.length === 0 ? (
          <EstadoVazio icone={<IconeCarrinho />} titulo="Nenhuma lista ainda">
            Crie a primeira lista acima. Ex.: Mercado, Feira, Farmácia.
          </EstadoVazio>
        ) : (
          <CartoesDeListas listas={ativas.data} />
        )}
      </section>
    </div>
  );
}

function CartoesDeListas({ listas }: { listas: Lista[] }) {
  return (
    <ul className={estilos.grade}>
      {listas.map((lista) => {
        const concluida = lista.totalItens > 0 && lista.itensComprados === lista.totalItens;
        const pendentes = lista.totalItens - lista.itensComprados;
        return (
          <li key={lista.id}>
            <Link
              to={`/listas/${lista.id}`}
              className={cartoes.cartao}
              data-estado={concluida ? 'concluida' : undefined}
            >
              <div className={cartoes.cartaoTopo}>
                <span className={cartoes.cartaoTitulo}>{lista.nome}</span>
                <span className={cartoes.cartaoSeta}>
                  <IconeSeta tamanho={20} />
                </span>
              </div>
              <div className={cartoes.cartaoSelos}>
                {lista.arquivada ? (
                  <Selo>Arquivada</Selo>
                ) : concluida ? (
                  <Selo tom="sucesso" ponto>
                    Tudo comprado
                  </Selo>
                ) : (
                  pendentes > 0 && (
                    <Selo tom="destaque" ponto>
                      {pendentes} a comprar
                    </Selo>
                  )
                )}
              </div>
              <Progresso comprados={lista.itensComprados} total={lista.totalItens} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ListasArquivadas({ familiaId }: { familiaId: number }) {
  const arquivadas = useQuery({
    queryKey: chaves.listas(familiaId, true),
    queryFn: () => listasApi.listar(familiaId, true),
  });

  if (arquivadas.isPending) return <Carregando linhas={1} />;
  if (arquivadas.isError) {
    return (
      <MensagemErro erro={arquivadas.error} aoTentarDeNovo={() => void arquivadas.refetch()} />
    );
  }
  if (arquivadas.data.length === 0) {
    return (
      <EstadoVazio icone={<IconeArquivo />} titulo="Nenhuma lista arquivada">
        Arquive pelas opções de uma lista para tirá-la da tela inicial sem perder os itens.
      </EstadoVazio>
    );
  }
  return <CartoesDeListas listas={arquivadas.data} />;
}
