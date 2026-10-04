import estilos from './Indicadores.module.css';

export interface Indicador {
  rotulo: string;
  valor: number | undefined;
  /** Número em azul: reservado ao dado principal da tela. */
  destaque?: boolean;
}

const formato = new Intl.NumberFormat('pt-BR');

/**
 * Faixa de números-resumo. O dado é o destaque: número grande e tabular, rótulo pequeno.
 * Sem valor (carregando) mostra "—" em vez de inventar um número.
 */
export function Indicadores({ itens, rotulo }: { itens: Indicador[]; rotulo: string }) {
  return (
    <dl className={estilos.indicadores} aria-label={rotulo}>
      {itens.map((item) => (
        <div key={item.rotulo} className={estilos.indicador}>
          <dt className={estilos.rotulo}>{item.rotulo}</dt>
          <dd
            className={[estilos.valor, item.destaque && estilos.destaque].filter(Boolean).join(' ')}
          >
            {item.valor === undefined ? '—' : formato.format(item.valor)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
