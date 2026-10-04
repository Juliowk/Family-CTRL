import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { ApiError } from '../api/cliente';
import { comprasApi, familiasApi } from '../api/endpoints';
import type { CompraItem } from '../api/tipos';
import { LinkBotao } from '../components/Botao';
import { CabecalhoPagina } from '../components/CabecalhoPagina';
import { Card } from '../components/Card';
import { Carregando, EstadoVazio, MensagemErro } from '../components/Estados';
import { IconeArquivo } from '../components/Icones';
import { Indicadores } from '../components/Indicadores';
import { Progresso } from '../components/Progresso';
import { Selo } from '../components/Selo';
import { chaves } from '../estado/chaves';
import { descreverPego, formatarData, formatarDinheiro } from '../util/compra';
import listaEstilos from './ListaPagina.module.css';
import paginas from './Paginas.module.css';

function detalhe(item: CompraItem) {
  if (!item.pego) return item.quantidadePlanejada ? `Planejado: ${item.quantidadePlanejada}` : '';
  return descreverPego(item);
}

/** Agrupa pelo nome da categoria guardado na compra, na ordem que ela tinha na época. */
function agrupar(itens: CompraItem[]) {
  const grupos = new Map<string, CompraItem[]>();
  for (const item of itens) {
    grupos.set(item.categoria, [...(grupos.get(item.categoria) ?? []), item]);
  }
  // Dentro da categoria: comprados primeiro, os não comprados no fim
  return [...grupos.entries()].map(([categoria, lista]) => ({
    categoria,
    itens: [...lista].sort((a, b) => Number(b.pego) - Number(a.pego)),
  }));
}

/** Compra concluída: só leitura, com valores, mercado e o que foi (ou não) comprado. */
export function CompraConcluida() {
  const { compraId: parametro } = useParams();
  const compraId = Number(parametro);

  const compra = useQuery({
    queryKey: chaves.compra(compraId),
    queryFn: () => comprasApi.detalhar(compraId),
    enabled: Number.isFinite(compraId),
  });
  const familiaId = compra.data?.familiaId;
  const familia = useQuery({
    queryKey: chaves.familia(familiaId ?? 0),
    queryFn: () => familiasApi.detalhar(familiaId ?? 0),
    enabled: familiaId !== undefined,
  });

  if (compra.isPending) return <Carregando linhas={4} />;
  if (compra.isError) {
    if (compra.error instanceof ApiError && compra.error.status === 404) {
      return (
        <EstadoVazio
          icone={<IconeArquivo />}
          titulo="Compra não encontrada"
          acao={<LinkBotao to="/inicio">Voltar às listas</LinkBotao>}
        >
          Ela pode pertencer a uma família da qual você não participa mais.
        </EstadoVazio>
      );
    }
    return <MensagemErro erro={compra.error} aoTentarDeNovo={() => void compra.refetch()} />;
  }

  const dados = compra.data;
  const grupos = agrupar(dados.itens);

  return (
    <div className={[paginas.pagina, paginas.estreita].join(' ')}>
      <CabecalhoPagina
        trilha={[
          {
            rotulo: familia.data?.nome ?? 'Compras',
            para: `/familias/${dados.familiaId}?ver=concluidas`,
          },
        ]}
        rotulo="Compra concluída"
        titulo={dados.listaNome}
        descricao={`${formatarData(dados.dataCompra)} · ${dados.mercado}${dados.finalizadaPor ? ` · finalizada por ${dados.finalizadaPor}` : ''}`}
        selos={
          <Selo tom="sucesso" ponto>
            Concluída
          </Selo>
        }
      />

      <Indicadores
        rotulo="Valores da compra"
        itens={[
          { rotulo: 'Total', valor: dados.valorTotal, dinheiro: true, destaque: true },
          { rotulo: 'Itens com preço', valor: dados.valorItens, dinheiro: true },
          { rotulo: 'Valor variável', valor: dados.valorVariavel, dinheiro: true },
        ]}
      />

      <Card>
        <Progresso comprados={dados.itensPegos} total={dados.totalItens} />
      </Card>

      <div className={listaEstilos.grupos}>
        {grupos.map(({ categoria, itens }) => (
          <section key={categoria} className={listaEstilos.grupo}>
            <h2 className={listaEstilos.grupoTitulo}>{categoria}</h2>
            <ul className={listaEstilos.itens}>
              {itens.map((item) => {
                const texto = detalhe(item);
                return (
                  <li key={item.id} className={listaEstilos.item} data-pego={item.pego}>
                    <div className={listaEstilos.planejado}>
                      <span className={listaEstilos.itemNome}>{item.nome}</span>
                      {texto && <span className={listaEstilos.itemDetalhe}>{texto}</span>}
                    </div>
                    <div className={listaEstilos.valorConcluido}>
                      {!item.pego ? (
                        <Selo>não comprado</Selo>
                      ) : item.subtotal !== null ? (
                        <span className={listaEstilos.valor}>
                          {formatarDinheiro(item.subtotal)}
                        </span>
                      ) : (
                        <Selo tom="atencao">valor do caixa</Selo>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
