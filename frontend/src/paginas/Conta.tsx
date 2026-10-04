import { Avatar } from '../components/Avatar';
import { Botao, LinkBotao } from '../components/Botao';
import { CabecalhoPagina } from '../components/CabecalhoPagina';
import { Card } from '../components/Card';
import { IconeSair, IconeTrocar } from '../components/Icones';
import { useAuth } from '../estado/auth';
import estilos from './Conta.module.css';
import paginas from './Paginas.module.css';

export function Conta() {
  const { usuario, sair } = useAuth();
  return (
    <div className={[paginas.pagina, paginas.estreita].join(' ')}>
      <CabecalhoPagina rotulo="Conta" titulo="Sua conta" />

      <Card className={estilos.perfil}>
        {usuario && <Avatar nome={usuario.nome} />}
        <div className={estilos.perfilTexto}>
          <p className={estilos.nome}>{usuario?.nome}</p>
          <p className={paginas.subtitulo}>{usuario?.email}</p>
        </div>
      </Card>

      <section className={paginas.secao} aria-labelledby="titulo-familias">
        <h2 id="titulo-familias" className={paginas.secaoTitulo}>
          Famílias
        </h2>
        <Card className={estilos.linha}>
          <p className={paginas.subtitulo}>
            Veja as famílias de que você participa, crie uma nova ou entre com um código.
          </p>
          <LinkBotao to="/familias" pequeno>
            <IconeTrocar tamanho={18} />
            Suas famílias
          </LinkBotao>
        </Card>
      </section>

      <section className={paginas.zonaRisco} aria-labelledby="titulo-sessao">
        <div className={paginas.zonaRiscoTexto}>
          <h2 id="titulo-sessao">Sair da conta</h2>
          <p className={paginas.subtitulo}>
            Você sai deste aparelho. Suas listas continuam salvas.
          </p>
        </div>
        <Botao variante="perigo" onClick={sair}>
          <IconeSair tamanho={18} />
          Sair
        </Botao>
      </section>
    </div>
  );
}
