import estilos from './Indicadores.module.css';

export interface Indicador {
  rotulo: string;
  /** Número (formatado) ou texto pronto (ex.: "04/10 · Atacadão"). */
  valor: number | string | undefined;
  dinheiro?: boolean;
  /** Número em azul: reservado ao dado principal da tela. */
  destaque?: boolean;
}

const formato = new Intl.NumberFormat('pt-BR');
const formatoDinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatar({ valor, dinheiro }: Indicador) {
  if (valor === undefined) return '—';
  if (typeof valor === 'string') return valor;
  return dinheiro ? formatoDinheiro.format(valor) : formato.format(valor);
}

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
            className={[
              estilos.valor,
              item.destaque && estilos.destaque,
              typeof item.valor === 'string' && estilos.texto,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {formatar(item)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
