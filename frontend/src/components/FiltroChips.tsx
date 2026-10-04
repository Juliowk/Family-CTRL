import estilos from './FiltroChips.module.css';

interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
}

/** Grupo de chips para alternar entre visões (ex.: Ativas / Arquivadas). */
export function FiltroChips<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string;
  opcoes: Opcao<T>[];
  /** Nulo: nenhuma opção escolhida ainda. */
  valor: T | null;
  aoMudar: (valor: T) => void;
}) {
  return (
    <div className={estilos.chips} role="group" aria-label={rotulo}>
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          className={estilos.chip}
          aria-pressed={opcao.valor === valor}
          onClick={() => aoMudar(opcao.valor)}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}
