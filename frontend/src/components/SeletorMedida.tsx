import type { TipoPreco } from '../api/tipos';
import campo from './Campo.module.css';
import { FiltroChips } from './FiltroChips';
import estilos from './SeletorMedida.module.css';

/**
 * Medida do item planejado: por unidade ou por kg (obrigatória). É o "preço por" que já vem
 * escolhido quando o item é pego no mercado.
 */
export function SeletorMedida({
  valor,
  aoMudar,
  erro,
}: {
  valor: TipoPreco | null;
  aoMudar: (medida: TipoPreco) => void;
  erro?: string;
}) {
  return (
    <div className={estilos.medida}>
      <div className={estilos.linha}>
        <span className={estilos.rotulo} aria-hidden="true">
          Medida
        </span>
        <FiltroChips
          rotulo="Medida"
          valor={valor}
          aoMudar={aoMudar}
          opcoes={[
            { valor: 'UNIDADE', rotulo: 'Por unidade' },
            { valor: 'KG', rotulo: 'Por kg' },
          ]}
        />
      </div>
      {erro && (
        <p className={campo.erro} role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
