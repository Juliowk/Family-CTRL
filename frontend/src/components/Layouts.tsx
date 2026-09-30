import { Link, Navigate, NavLink, Outlet } from 'react-router';
import { useAuth } from '../estado/auth';
import { useFamiliaAtual } from '../estado/familiaAtual';
import { Carregando, MensagemErro } from './Estados';
import { IconeConta, IconeFamilia, IconeLista } from './Icones';
import estilos from './Layouts.module.css';

function Marca() {
  return (
    <span className={estilos.marca}>
      <span className={estilos.marcaIcone} aria-hidden="true" />
      Family Ctrl
    </span>
  );
}

/** Telas públicas (landing, login, cadastro). Quem já está logado vai direto para o app. */
export function LayoutPublico() {
  const { autenticado } = useAuth();
  if (autenticado) return <Navigate to="/inicio" replace />;
  return (
    <div className={estilos.publico}>
      <header className={estilos.publicoTopo}>
        <Link to="/" className={estilos.linkMarca}>
          <Marca />
        </Link>
      </header>
      <main className={estilos.publicoConteudo}>
        <Outlet />
      </main>
    </div>
  );
}

/**
 * Área logada: exige token e carrega o usuário (GET /api/auth/me) antes de mostrar as telas.
 * A navegação fica numa barra inferior no celular (alcance do polegar) e no topo no desktop.
 */
export function LayoutAutenticado() {
  const { autenticado, usuario, carregandoUsuario, erroUsuario, recarregarUsuario } = useAuth();
  const [familiaAtual] = useFamiliaAtual();

  if (!autenticado) return <Navigate to="/login" replace />;

  if (carregandoUsuario || (!usuario && !erroUsuario)) {
    return (
      <div className={estilos.telaCheia}>
        <Carregando />
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className={estilos.telaCheia}>
        <MensagemErro erro={erroUsuario} aoTentarDeNovo={recarregarUsuario} />
      </div>
    );
  }

  const inicio = familiaAtual ? `/familias/${familiaAtual}` : '/familias';
  const familia = familiaAtual ? `/familias/${familiaAtual}/membros` : '/familias';
  const classeLink = ({ isActive }: { isActive: boolean }) =>
    [estilos.navLink, isActive && estilos.navLinkAtivo].filter(Boolean).join(' ');

  return (
    <div className={estilos.app}>
      <header className={estilos.topo}>
        <div className={estilos.topoInterno}>
          <Link to="/inicio" className={estilos.linkMarca}>
            <Marca />
          </Link>
          <nav className={estilos.nav} aria-label="Navegação principal">
            <NavLink to={inicio} end className={classeLink}>
              <IconeLista />
              <span>Listas</span>
            </NavLink>
            <NavLink to={familia} className={classeLink}>
              <IconeFamilia />
              <span>Família</span>
            </NavLink>
            <NavLink to="/conta" className={classeLink}>
              <IconeConta />
              <span>Conta</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main className={estilos.conteudo}>
        <Outlet />
      </main>
    </div>
  );
}
