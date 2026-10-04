import { useTema } from '../estado/tema';
import estilos from './AlternarTema.module.css';
import { IconeLua, IconeSol } from './Icones';

/** Botão redondo que alterna entre tema claro e escuro. */
export function AlternarTema({ className }: { className?: string }) {
  const [tema, definirTema] = useTema();
  const escuro = tema === 'escuro';
  return (
    <button
      type="button"
      className={[estilos.botao, className].filter(Boolean).join(' ')}
      aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
      title={escuro ? 'Tema claro' : 'Tema escuro'}
      onClick={() => definirTema(escuro ? 'claro' : 'escuro')}
    >
      {escuro ? <IconeSol tamanho={20} /> : <IconeLua tamanho={20} />}
    </button>
  );
}
