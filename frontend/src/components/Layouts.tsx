import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { familiasApi } from '../api/endpoints';
import { useAuth } from '../estado/auth';
import { chaves } from '../estado/chaves';
import { useFamiliaAtual } from '../estado/familiaAtual';
import { useTema, type Tema } from '../estado/tema';
import { AlternarTema } from './AlternarTema';
import { Avatar } from './Avatar';
import { LinkBotao } from './Botao';
import { Logo } from './brand/Logo';
import { Carregando, MensagemErro } from './Estados';
import { IconeConta, IconeCtrl, IconeEtiqueta, IconeFamilia, IconeTrocar } from './Icones';
import estilos from './Layouts.module.css';

const REPOSITORIO = 'https://github.com/Juliowk/Family-CTRL';

/** Assinatura da marca seguindo o tema atual (na barra lateral, sempre escura, use tema="escuro"). */
function Marca({ tema }: { tema?: Tema }) {
  const [temaAtual] = useTema();
  // 28px: a assinatura fica com ~130px, acima do mínimo de 120px e cabe no topo em telas de 320px
  return <Logo tema={tema ?? temaAtual} tamanho={28} />;
}

/** Telas públicas (landing, login, cadastro). Quem já está logado vai direto para o app. */
export function LayoutPublico() {
  const { autenticado } = useAuth();
  const { pathname } = useLocation();
  if (autenticado) return <Navigate to="/inicio" replace />;
  return (
    <div className={estilos.publico}>
      <header className={estilos.publicoTopo}>
        <div className={estilos.publicoTopoInterno}>
          <Link to="/" className={estilos.linkMarca}>
            <Marca />
          </Link>
          <nav className={estilos.publicoNav} aria-label="Acesso">
            <AlternarTema />
            {pathname !== '/login' && (
              <LinkBotao
                to="/login"
                variante="fantasma"
                pequeno
                // Na landing o herói já tem "Já tenho conta": em telas estreitas, o topo fica só com o CTA
                className={pathname === '/' ? estilos.entrarOpcional : undefined}
              >
                Entrar
              </LinkBotao>
            )}
            {pathname !== '/cadastro' && (
              <LinkBotao to="/cadastro" variante="primario" pequeno>
                Criar conta
              </LinkBotao>
            )}
          </nav>
        </div>
      </header>
      <main className={estilos.publicoConteudo}>
        <Outlet />
      </main>
      <footer className={estilos.rodape}>
        <div className={estilos.rodapeInterno}>
          <Marca />
          <p>
            Projeto de estudo com código aberto no <a href={REPOSITORIO}>GitHub</a>.
          </p>
        </div>
      </footer>
    </div>
  );
}

const classeLink = ({ isActive }: { isActive: boolean }) =>
  [estilos.navLink, isActive && estilos.navLinkAtivo].filter(Boolean).join(' ');

/**
 * "ctrl" (tela inicial da família, com as funcionalidades) continua ativo dentro de uma lista ou
 * compra, que são filhas da funcionalidade de listas.
 */
const classeLinkCtrl =
  (dentroDeLista: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    classeLink({ isActive: isActive || dentroDeLista });

/**
 * Área logada: exige token e carrega o usuário (GET /api/auth/me) antes de mostrar as telas.
 * Desktop: barra lateral escura com a família atual e a conta.
 * Celular: topo compacto e barra inferior fixa (alcance do polegar).
 */
export function LayoutAutenticado() {
  const { autenticado, usuario, carregandoUsuario, erroUsuario, recarregarUsuario } = useAuth();
  const [familiaAtual] = useFamiliaAtual();
  const { pathname } = useLocation();
  // Lista, finalização e compra concluída são "filhas" da tela inicial da família
  const dentroDeLista = pathname.startsWith('/listas/') || pathname.startsWith('/compras/');
  // Mesmo cache das telas da família: normalmente já está carregado e não gera requisição
  const familia = useQuery({
    queryKey: chaves.familia(familiaAtual ?? 0),
    queryFn: () => familiasApi.detalhar(familiaAtual ?? 0),
    enabled: autenticado && !!usuario && familiaAtual !== null,
  });

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

  // Sem família escolhida (logo após o login ou na tela de escolha), não há listas nem membros
  // para navegar: só o topo com a conta no canto superior direito
  if (familiaAtual === null || pathname === '/familias') {
    return (
      <div className={[estilos.app, estilos.appSimples].join(' ')}>
        <header className={estilos.topo}>
          <Link to="/inicio" className={estilos.linkMarca}>
            <Marca />
          </Link>
          <div className={estilos.topoAcoes}>
            <AlternarTema />
            <NavLink to="/conta" className={estilos.topoConta}>
              <Avatar nome={usuario.nome} pequeno />
              <span className="sr-only">Conta</span>
            </NavLink>
          </div>
        </header>
        <main className={estilos.conteudo}>
          <div className={estilos.conteudoInterno}>
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  const inicio = `/familias/${familiaAtual}`;
  const membros = `/familias/${familiaAtual}/membros`;
  const nomeFamilia = familia.data?.nome;

  return (
    <div className={estilos.app}>
      <aside className={estilos.lateral}>
        <Link to="/inicio" className={estilos.lateralMarca}>
          <Marca tema="escuro" />
        </Link>

        <nav className={estilos.lateralNav} aria-label="Navegação principal">
          <p className={estilos.lateralRotulo}>Família</p>
          {nomeFamilia && <p className={estilos.lateralFamilia}>{nomeFamilia}</p>}
          <NavLink to={inicio} end className={classeLinkCtrl(dentroDeLista)}>
            <IconeCtrl tamanho={20} />
            <span>ctrl</span>
          </NavLink>
          <NavLink to={membros} end className={classeLink}>
            <IconeFamilia tamanho={20} />
            <span>Membros e convite</span>
          </NavLink>
          <NavLink to={`/familias/${familiaAtual}/categorias`} end className={classeLink}>
            <IconeEtiqueta tamanho={20} />
            <span>Categorias</span>
          </NavLink>
          <NavLink to="/familias" end className={classeLink}>
            <IconeTrocar tamanho={20} />
            <span>Trocar família</span>
          </NavLink>
        </nav>

        <div className={estilos.lateralRodape}>
          <AlternarTema className={estilos.lateralTema} />
        </div>

        <NavLink to="/conta" className={estilos.lateralConta}>
          <Avatar nome={usuario.nome} pequeno />
          <span className={estilos.lateralContaTexto}>
            <span className={estilos.lateralContaNome}>{usuario.nome}</span>
            <span className={estilos.lateralContaEmail}>{usuario.email}</span>
          </span>
        </NavLink>
      </aside>

      <header className={estilos.topo}>
        <Link to="/inicio" className={estilos.linkMarca}>
          <Marca />
        </Link>
        <div className={estilos.topoAcoes}>
          {nomeFamilia && (
            <Link to="/familias" className={estilos.topoFamilia}>
              <span className={estilos.topoFamiliaNome}>{nomeFamilia}</span>
              <IconeTrocar tamanho={16} />
              <span className="sr-only">(trocar família)</span>
            </Link>
          )}
          <AlternarTema />
        </div>
      </header>

      <main className={estilos.conteudo}>
        <div className={estilos.conteudoInterno}>
          <Outlet />
        </div>
      </main>

      <nav className={estilos.barraInferior} aria-label="Navegação rápida">
        <NavLink to={inicio} end className={classeLinkCtrl(dentroDeLista)}>
          <IconeCtrl tamanho={24} />
          <span>ctrl</span>
        </NavLink>
        <NavLink to={membros} end className={classeLink}>
          <IconeFamilia tamanho={24} />
          <span>Família</span>
        </NavLink>
        <NavLink to="/conta" className={classeLink}>
          <IconeConta tamanho={24} />
          <span>Conta</span>
        </NavLink>
      </nav>
    </div>
  );
}
