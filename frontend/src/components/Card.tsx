import { useId, type HTMLAttributes, type ReactNode } from 'react';
import estilos from './Card.module.css';

/** Superfície com borda sutil para agrupar conteúdo. Sem sombra: só o que flutua tem sombra. */
export function Card({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[estilos.card, className].filter(Boolean).join(' ')} {...resto} />;
}

interface PropsNumerado {
  numero: number;
  titulo: string;
  descricao?: string;
  children: ReactNode;
}

/**
 * Card de uma etapa ("01 Criar família"). Numerar blocos de formulário dá sensação de
 * progresso e deixa claro que são caminhos distintos.
 */
export function CardNumerado({ numero, titulo, descricao, children }: PropsNumerado) {
  const id = useId();
  return (
    <section className={[estilos.card, estilos.numerado].join(' ')} aria-labelledby={id}>
      <div className={estilos.numeradoCabecalho}>
        <span className={estilos.numero} aria-hidden="true">
          {String(numero).padStart(2, '0')}
        </span>
        <div>
          <h2 id={id} className={estilos.numeradoTitulo}>
            {titulo}
          </h2>
          {descricao && <p className={estilos.numeradoDescricao}>{descricao}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
