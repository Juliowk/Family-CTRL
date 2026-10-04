import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import estilos from './Campo.module.css';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  erro?: string;
  dica?: string;
  /** Esconde o rótulo visualmente (continua disponível para leitores de tela). */
  rotuloOculto?: boolean;
}

/** Campo de texto com rótulo, dica e mensagem de erro acessíveis. */
export function Campo({ rotulo, erro, dica, rotuloOculto = false, className, ...resto }: Props) {
  const id = useId();
  const idDica = dica ? `${id}-dica` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;
  return (
    <div className={[estilos.campo, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={rotuloOculto ? 'sr-only' : estilos.rotulo}>
        {rotulo}
      </label>
      <input
        id={id}
        className={estilos.entrada}
        aria-invalid={erro ? true : undefined}
        aria-describedby={[idDica, idErro].filter(Boolean).join(' ') || undefined}
        {...resto}
      />
      {dica && (
        <p id={idDica} className={estilos.dica}>
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className={estilos.erro}>
          {erro}
        </p>
      )}
    </div>
  );
}

interface PropsArea extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo: string;
  erro?: string;
  dica?: string;
}

/** Área de texto de várias linhas com o mesmo visual e acessibilidade do {@link Campo}. */
export function AreaTexto({ rotulo, erro, dica, className, ...resto }: PropsArea) {
  const id = useId();
  const idDica = dica ? `${id}-dica` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;
  return (
    <div className={[estilos.campo, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={estilos.rotulo}>
        {rotulo}
      </label>
      <textarea
        id={id}
        className={[estilos.entrada, estilos.area].join(' ')}
        aria-invalid={erro ? true : undefined}
        aria-describedby={[idDica, idErro].filter(Boolean).join(' ') || undefined}
        {...resto}
      />
      {dica && (
        <p id={idDica} className={estilos.dica}>
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className={estilos.erro}>
          {erro}
        </p>
      )}
    </div>
  );
}
