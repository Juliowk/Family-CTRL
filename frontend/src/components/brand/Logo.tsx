import type { CSSProperties } from 'react';
import type { Tema } from '../../estado/tema';
import estilos from './Logo.module.css';

/**
 * Logo do Family Ctrl (guia em docs/marca.md): a tecla ⌃ (Control), que também é o telhado de
 * uma casa, com os "pontos família" (pai, mãe e filho) embaixo.
 *
 * <Logo />                            assinatura horizontal no tema escuro
 * <Logo tema="claro" />               assinatura horizontal no tema claro
 * <Logo variante="icone" tamanho={56} /> só o símbolo
 * Abaixo de 48px o símbolo troca sozinho para a versão simplificada (sem a tecla).
 */
interface Props {
  variante?: 'horizontal' | 'icone';
  tema?: Tema;
  /** Altura do símbolo em px */
  tamanho?: number;
  /** Força (ou impede) a versão simplificada do símbolo */
  simplificado?: boolean;
  className?: string;
}

// Cores oficiais do símbolo. São fixas de propósito: o logo não segue os tokens da interface.
const CORES = {
  escuro: {
    fundo: '#0F0F14',
    tecla: '#1F1F29',
    lateral: '#000000',
    traco: '#FFFFFF',
    ponto: '#A78BFA',
    borda: '#2E2E3A',
  },
  claro: {
    fundo: '#F4F4F5',
    tecla: '#FFFFFF',
    lateral: '#D4D4D8',
    traco: '#0F0F14',
    ponto: '#7C3AED',
    borda: '#E4E4E7',
  },
} as const;

// Pai, mãe e filho: sempre em tamanhos decrescentes
const PONTOS = [
  { cx: 24.6, r: 3.1 },
  { cx: 32, r: 2.6 },
  { cx: 38.6, r: 2.0 },
];
const PONTOS_SIMPLIFICADO = [
  { cx: 20.5, r: 4.6 },
  { cx: 32, r: 3.8 },
  { cx: 42.5, r: 3.0 },
];

/** Só o símbolo (grade de 64 unidades). Decorativo: quem usa dá o nome acessível. */
export function SimboloLogo({
  tema = 'escuro',
  tamanho = 40,
  simplificado,
}: Pick<Props, 'tema' | 'tamanho' | 'simplificado'>) {
  const c = CORES[tema];
  const simples = simplificado ?? tamanho < 48;
  return (
    <svg
      viewBox="0 0 64 64"
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
      focusable="false"
      className={estilos.simbolo}
    >
      <rect x=".5" y=".5" width="63" height="63" rx="15.5" fill={c.fundo} stroke={c.borda} />
      {simples ? (
        <>
          <path
            d="M17 34 L32 19 L47 34"
            stroke={c.traco}
            strokeWidth={7.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {PONTOS_SIMPLIFICADO.map((p) => (
            <circle key={p.cx} cx={p.cx} cy={46} r={p.r} fill={c.ponto} />
          ))}
        </>
      ) : (
        <>
          <rect x="12" y="14" width="40" height="39" rx="10" fill={c.lateral} />
          <rect x="12" y="11" width="40" height="38" rx="10" fill={c.tecla} />
          <path
            d="M21 32 L32 21 L43 32"
            stroke={c.traco}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {PONTOS.map((p) => (
            <circle key={p.cx} cx={p.cx} cy={40} r={p.r} fill={c.ponto} />
          ))}
        </>
      )}
    </svg>
  );
}

export function Logo({
  variante = 'horizontal',
  tema = 'escuro',
  tamanho = 32,
  simplificado,
  className,
}: Props) {
  const classes = [estilos.logo, className].filter(Boolean).join(' ');
  // Nome acessível único ("Family Ctrl"); o desenho e a palavra "familyctrl" ficam escondidos
  return (
    <span
      role="img"
      aria-label="Family Ctrl"
      className={classes}
      data-tema={tema}
      style={{ '--logo-tamanho': `${tamanho}px` } as CSSProperties}
    >
      <SimboloLogo tema={tema} tamanho={tamanho} simplificado={simplificado} />
      {variante === 'horizontal' && (
        <span className={estilos.palavra} aria-hidden="true">
          <b>family</b>
          <span className={estilos.ctrl}>ctrl</span>
        </span>
      )}
    </span>
  );
}
