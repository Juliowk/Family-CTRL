import { useId, type SelectHTMLAttributes } from 'react';
import estilos from './Campo.module.css';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo: string;
  erro?: string;
  opcoes: { valor: string | number; rotulo: string }[];
}

/** Lista de opções (select nativo: no celular abre o seletor do sistema) com rótulo e erro. */
export function CampoSelecao({ rotulo, erro, opcoes, className, ...resto }: Props) {
  const id = useId();
  const idErro = erro ? `${id}-erro` : undefined;
  return (
    <div className={[estilos.campo, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={estilos.rotulo}>
        {rotulo}
      </label>
      <select
        id={id}
        className={[estilos.entrada, estilos.selecao].join(' ')}
        aria-invalid={erro ? true : undefined}
        aria-describedby={idErro}
        {...resto}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
      {erro && (
        <p id={idErro} className={estilos.erro}>
          {erro}
        </p>
      )}
    </div>
  );
}
