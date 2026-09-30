import estilos from './Progresso.module.css';

/** "3 de 5 comprados" com uma barra fina. Usa o elemento nativo <progress> (acessível). */
export function Progresso({ comprados, total }: { comprados: number; total: number }) {
  const texto = total === 0 ? 'Nenhum item' : `${comprados} de ${total} comprados`;
  return (
    <div className={estilos.progresso}>
      <span className={estilos.texto}>{texto}</span>
      <progress
        className={estilos.barra}
        value={comprados}
        max={Math.max(total, 1)}
        aria-label={texto}
      />
    </div>
  );
}
