import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import estilos from './Modal.module.css';

interface Props {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}

const FOCAVEIS = 'button:not([disabled]), input:not([disabled]), textarea, select, a[href]';

/**
 * Janela modal acessível: foca o primeiro campo ao abrir, mantém o foco dentro dela (Tab),
 * fecha com Esc ou clique fora e devolve o foco ao elemento anterior ao fechar.
 */
export function Modal({ aberto, titulo, aoFechar, children }: Props) {
  const idTitulo = useId();
  const painel = useRef<HTMLDivElement>(null);
  const aoFecharRef = useRef(aoFechar);

  useEffect(() => {
    aoFecharRef.current = aoFechar;
  }, [aoFechar]);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        aoFecharRef.current();
        return;
      }
      if (evento.key !== 'Tab' || !painel.current) return;
      const focaveis = Array.from(painel.current.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      anterior?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  return createPortal(
    <div
      className={estilos.fundo}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <div
        ref={painel}
        className={estilos.painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
      >
        <h2 id={idTitulo} className={estilos.titulo}>
          {titulo}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
