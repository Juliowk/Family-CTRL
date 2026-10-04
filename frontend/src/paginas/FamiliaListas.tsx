import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../api/cliente';
import { comprasApi, listasApi } from '../api/endpoints';
import type { CompraResumo, Lista } from '../api/tipos';
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
import { formatarData, formatarDinheiro, mesAtual } from '../util/compra';
import cartoes from './Cartoes.module.css';
import { ErroFamilia } from './FamiliaNaoEncontrada';
import estilos from './Paginas.module.css';
import { useFamiliaDaRota } from './useFamiliaDaRota';

type Visao = 'listas' | 'concluidas';

/** Tela inicial da família: gasto do mês, listas (planejamento) e compras concluídas. */
export function FamiliaListas() {
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const { familiaId, familia } = useFamiliaDaRota();
  // A visão fica na URL (?ver=concluidas): recarregar ou compartilhar o link abre igual
  const [parametros, setParametros] = useSearchParams();
  const visao: Visao = parametros.get('ver') === 'concluidas' ? 'concluidas' : 'listas';
  const [nome, setNome] = useState('');
  const mes = mesAtual();

  const listas = useQuery({
    queryKey: chaves.listas(familiaId),
    queryFn: () => listasApi.listar(familiaId),
    enabled: familia.isSuccess,
  });
  const resumo = useQuery({
    queryKey: chaves.resumo(familiaId, mes),
    queryFn: () => comprasApi.resumo(familiaId, mes),
    enabled: familia.isSuccess,
  });

  const criar = useMutation({
    mutationFn: (nomeLista: string) => listasApi.criar(familiaId, nomeLista),
    onSuccess: (lista) => {
      setNome('');
      void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
      navegar(`/listas/${lista.id}/planejar`);
    },
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nome.trim()) criar.mutate(nome.trim());
  }

  function mudarVisao(nova: Visao) {
    setParametros(nova === 'concluidas' ? { ver: 'concluidas' } : {}, { replace: true });
  }

  if (familia.isPending) return <Carregando />;
  if (familia.isError) {
    return <ErroFamilia erro={familia.error} aoTentarDeNovo={() => void familia.refetch()} />;
  }

  const ultima = resumo.data?.ultimaCompra;

  return (
    <div className={estilos.pagina}>
      <CabecalhoPagina
        trilha={[{ rotulo: 'Famílias', para: '/familias' }]}
        rotulo="Família"
        titulo={familia.data.nome}
        descricao="Planeje as listas em casa e acompanhe a compra no mercado."
      />

      <Indicadores
        rotulo="Resumo do mês"
        itens={[
          { rotulo: 'Gasto no mês', valor: resumo.data?.gasto, dinheiro: true, destaque: true },
          { rotulo: 'Compras no mês', valor: resumo.data?.compras },
          {
            rotulo: 'Última compra',
            valor: resumo.isPending
              ? undefined
              : ultima
                ? `${formatarData(ultima.dataCompra)} · ${ultima.mercado}`
                : 'Nenhuma ainda',
          },
        ]}
      />

      <section className={estilos.secao} aria-labelledby="titulo-listas">
        <div className={estilos.secaoCabecalho}>
          <h2 id="titulo-listas" className={estilos.secaoTitulo}>
            {visao === 'listas' ? 'Listas' : 'Compras concluídas'}
          </h2>
          <FiltroChips
            rotulo="Mostrar"
            valor={visao}
            aoMudar={mudarVisao}
            opcoes={[
              { valor: 'listas', rotulo: 'Listas' },
              { valor: 'concluidas', rotulo: 'Concluídas' },
            ]}
          />
        </div>

        {visao === 'concluidas' ? (
          <ComprasConcluidas familiaId={familiaId} />
        ) : listas.isPending ? (
          <Carregando />
        ) : listas.isError ? (
          <MensagemErro erro={listas.error} aoTentarDeNovo={() => void listas.refetch()} />
        ) : listas.data.length === 0 ? (
          <EstadoVazio icone={<IconeCarrinho />} titulo="Nenhuma lista ainda">
            Crie a primeira lista logo abaixo. Ex.: Compras do mês, Feira, Farmácia.
          </EstadoVazio>
        ) : (
          <CartoesDeListas listas={listas.data} />
        )}
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-criar">
        <h2 id="titulo-criar" className={estilos.secaoTitulo}>
          Criar lista
        </h2>
        <Card>
          <form className={form.linha} onSubmit={enviar}>
            <Campo
              rotulo="Nome da nova lista"
              rotuloOculto
              placeholder="Ex.: Compras do mês"
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
      </section>
    </div>
  );
}

function CartoesDeListas({ listas }: { listas: Lista[] }) {
  return (
    <ul className={estilos.grade}>
      {listas.map((lista) => (
        <li key={lista.id}>
          <Link to={`/listas/${lista.id}`} className={cartoes.cartao}>
            <div className={cartoes.cartaoTopo}>
              <span className={cartoes.cartaoTitulo}>{lista.nome}</span>
              <span className={cartoes.cartaoSeta}>
                <IconeSeta tamanho={20} />
              </span>
            </div>
            <div className={cartoes.cartaoSelos}>
              <Selo>
                {lista.totalItens} {lista.totalItens === 1 ? 'item' : 'itens'}
              </Selo>
              {lista.itensPegos > 0 && (
                <Selo tom="destaque" ponto>
                  Compra em andamento
                </Selo>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ComprasConcluidas({ familiaId }: { familiaId: number }) {
  const compras = useQuery({
    queryKey: chaves.compras(familiaId),
    queryFn: () => comprasApi.listar(familiaId),
  });

  if (compras.isPending) return <Carregando linhas={2} />;
  if (compras.isError) {
    return <MensagemErro erro={compras.error} aoTentarDeNovo={() => void compras.refetch()} />;
  }
  if (compras.data.length === 0) {
    return (
      <EstadoVazio icone={<IconeArquivo />} titulo="Nenhuma compra concluída">
        Ao finalizar a compra de uma lista, ela fica guardada aqui com valor, data e mercado.
      </EstadoVazio>
    );
  }
  return (
    <ul className={estilos.grade}>
      {compras.data.map((compra) => (
        <li key={compra.id}>
          <CartaoCompra compra={compra} />
        </li>
      ))}
    </ul>
  );
}

function CartaoCompra({ compra }: { compra: CompraResumo }) {
  return (
    <Link to={`/compras/${compra.id}`} className={cartoes.cartao} data-estado="concluida">
      <div className={cartoes.cartaoTopo}>
        <div>
          <span className={cartoes.cartaoTitulo}>{compra.listaNome}</span>
          <p className={cartoes.cartaoMeta}>
            {formatarData(compra.dataCompra)} · {compra.mercado}
          </p>
        </div>
        <span className={cartoes.cartaoValor}>{formatarDinheiro(compra.valorTotal)}</span>
      </div>
      <Progresso comprados={compra.itensPegos} total={compra.totalItens} />
    </Link>
  );
}
