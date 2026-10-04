import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import estilos from './Botao.module.css';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo';

interface Aparencia {
  variante?: Variante;
  larguraTotal?: boolean;
  pequeno?: boolean;
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement>, Aparencia {
  carregando?: boolean;
}

function classes({ variante = 'secundario', larguraTotal, pequeno }: Aparencia, extra?: string) {
  return [
    estilos.botao,
    estilos[variante],
    larguraTotal && estilos.larguraTotal,
    pequeno && estilos.pequeno,
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

export function Botao({
  variante,
  carregando = false,
  larguraTotal,
  pequeno,
  disabled,
  className,
  type = 'button',
  children,
  ...resto
}: Props) {
  return (
    <button
      type={type}
      className={classes({ variante, larguraTotal, pequeno }, className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando && <span className={estilos.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Link de navegação com aparência de botão (ex.: CTAs da landing). */
export function LinkBotao({
  variante,
  larguraTotal,
  pequeno,
  className,
  ...resto
}: LinkProps & Aparencia) {
  return <Link className={classes({ variante, larguraTotal, pequeno }, className)} {...resto} />;
}
