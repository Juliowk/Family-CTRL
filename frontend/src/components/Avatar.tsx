import estilos from './Avatar.module.css';

// Preposições não viram inicial: "Casa da Ana" -> "CA"
const LIGACOES = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);

/** Iniciais do nome num círculo (identifica pessoas sem depender de foto). */
export function Avatar({ nome, pequeno = false }: { nome: string; pequeno?: boolean }) {
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte && !LIGACOES.has(parte.toLowerCase()))
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
  return (
    <span
      className={[estilos.avatar, pequeno && estilos.pequeno].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {iniciais || '?'}
    </span>
  );
}
