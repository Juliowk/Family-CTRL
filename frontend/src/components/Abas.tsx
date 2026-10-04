import { NavLink } from 'react-router';
import estilos from './Abas.module.css';

export interface Aba {
  rotulo: string;
  para: string;
}

/**
 * Abas que são rotas: cada aba tem endereço próprio (recarregar ou compartilhar o link abre na
 * aba certa) e o item ativo é marcado com aria-current.
 */
export function Abas({ abas, rotulo }: { abas: Aba[]; rotulo: string }) {
  return (
    <nav className={estilos.abas} aria-label={rotulo}>
      {abas.map((aba) => (
        <NavLink
          key={aba.para}
          to={aba.para}
          replace
          className={({ isActive }) =>
            [estilos.aba, isActive && estilos.ativa].filter(Boolean).join(' ')
          }
        >
          {aba.rotulo}
        </NavLink>
      ))}
    </nav>
  );
}
