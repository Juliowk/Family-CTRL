import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { comprasApi, listasApi } from '../api/endpoints';
import type { CompraResumo, Lista } from '../api/tipos';
import { Card } from '../components/Card';
import { Carregando, EstadoVazio, MensagemErro } from '../components/Estados';
import { FiltroChips } from '../components/FiltroChips';
import { IconeArquivo, IconeCarrinho, IconeSeta } from '../components/Icones';
import { Progresso } from '../components/Progresso';
import { Selo } from '../components/Selo';
import { chaves } from '../estado/chaves';
import { dataEMercado, formatarDinheiro } from '../util/compra';
import cartoes from './Cartoes.module.css';
import { ImportarLista } from './ImportarLista';
import estilos from './Paginas.module.css';

type Visao = 'listas' | 'concluidas';

/**
 * Funcionalidade "Listas de compras", aberta na tela inicial da família: listas (planejamento),
 * compras concluídas e importação. Criar uma lista em branco fica no topo da tela da família.
 */
export function FuncionalidadeListas({ familiaId }: { familiaId: number }) {
  // A visão fica na URL (?ver=concluidas): recarregar ou compartilhar o link abre igual
  const [parametros, setParametros] = useSearchParams();
  const visao: Visao = parametros.get('ver') === 'concluidas' ? 'concluidas' : 'listas';

  // Atualiza sozinho o progresso ("em andamento") quando outra pessoa está comprando
  const listas = useQuery({
    queryKey: chaves.listas(familiaId),
    queryFn: () => listasApi.listar(familiaId),
    refetchInterval: 10_000,
  });

  function mudarVisao(nova: Visao) {
    // Mantém os outros parâmetros (a funcionalidade aberta) e troca só a visão
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais);
        if (nova === 'concluidas') novos.set('ver', 'concluidas');
        else novos.delete('ver');
        return novos;
      },
      { replace: true },
    );
  }

  return (
    <>
      <section className={estilos.secao} aria-labelledby="titulo-listas">
        <div className={estilos.secaoCabecalho}>
          <h2 id="titulo-listas" className={estilos.secaoTitulo} tabIndex={-1}>
            Listas
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
            Use o botão “Criar lista”, lá em cima. Ex.: Compras do mês, Feira, Farmácia.
          </EstadoVazio>
        ) : (
          <CartoesDeListas listas={listas.data} />
        )}
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-importar">
        <h2 id="titulo-importar" className={estilos.secaoTitulo}>
          Importar lista
        </h2>
        <Card>
          <ImportarLista familiaId={familiaId} />
        </Card>
      </section>
    </>
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
          <p className={cartoes.cartaoMeta}>{dataEMercado(compra)}</p>
        </div>
        <span className={cartoes.cartaoValor}>{formatarDinheiro(compra.valorTotal)}</span>
      </div>
      <Progresso comprados={compra.itensPegos} total={compra.totalItens} />
      {compra.exemplo && (
        <div className={cartoes.cartaoSelos}>
          <Selo>Exemplo · fora do resumo do mês</Selo>
        </div>
      )}
    </Link>
  );
}
