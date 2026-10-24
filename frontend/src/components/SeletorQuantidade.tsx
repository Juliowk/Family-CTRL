import { useId } from 'react';
import type { TipoPreco } from '../api/tipos';
import { formatarQuantidade, lerDecimal, paraCampo, passoDaMedida } from '../util/compra';
import campo from './Campo.module.css';
import { IconeMais, IconeMenos } from './Icones';
import estilos from './SeletorQuantidade.module.css';

/**
 * Quantidade com botões − e +: de 1 em 1 por unidade e de 100 em 100 g por kg. O campo também
 * aceita digitar o valor exato (ex.: 1,25). Quem usa guarda o texto, que pode estar incompleto
 * enquanto a pessoa digita.
 */
export function SeletorQuantidade({
  rotulo,
  medida,
  texto,
  aoMudar,
  erro,
}: {
  rotulo: string;
  medida: TipoPreco;
  texto: string;
  aoMudar: (texto: string) => void;
  erro?: string;
}) {
  const id = useId();
  const idDica = `${id}-dica`;
  const idErro = `${id}-erro`;
  const passo = passoDaMedida(medida);
  const valor = lerDecimal(texto);
  // Por kg, abaixo de 1 kg mostra também em gramas ("0,3 kg" é "300 g")
  const dica = medida === 'KG' && valor !== undefined && valor > 0 && valor < 1;

  function somar(delta: number) {
    const novo = Math.round(((valor ?? 0) + delta) * 1000) / 1000;
    aoMudar(paraCampo(Math.max(passo, novo)));
  }

  return (
    <div className={campo.campo}>
      <label htmlFor={id} className={campo.rotulo}>
        {rotulo}
      </label>
      <div className={estilos.linha}>
        <button
          type="button"
          className={estilos.botao}
          aria-label={`Diminuir ${rotulo.toLowerCase()}`}
          disabled={valor !== undefined && valor <= passo}
          onClick={() => somar(-passo)}
        >
          <IconeMenos />
        </button>
        <div className={estilos.entradaComUnidade}>
          <input
            id={id}
            className={[campo.entrada, estilos.entrada].join(' ')}
            inputMode="decimal"
            autoComplete="off"
            value={texto}
            onChange={(e) => aoMudar(e.target.value)}
            aria-invalid={erro ? true : undefined}
            aria-describedby={
              [dica && idDica, erro && idErro].filter(Boolean).join(' ') || undefined
            }
          />
          <span className={estilos.unidade} aria-hidden="true">
            {medida === 'KG' ? 'kg' : 'un'}
          </span>
        </div>
        <button
          type="button"
          className={estilos.botao}
          aria-label={`Aumentar ${rotulo.toLowerCase()}`}
          onClick={() => somar(passo)}
        >
          <IconeMais />
        </button>
      </div>
      {dica && (
        <p id={idDica} className={campo.dica}>
          {formatarQuantidade(valor, medida)}
        </p>
      )}
      {erro && (
        <p id={idErro} className={campo.erro}>
          {erro}
        </p>
      )}
    </div>
  );
}
