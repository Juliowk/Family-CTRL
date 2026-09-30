import { useNavigate } from 'react-router';
import { Botao } from '../components/Botao';
import { IconeCheck } from '../components/Icones';
import estilos from './Paginas.module.css';

export function Landing() {
  const navegar = useNavigate();
  return (
    <div className={estilos.hero}>
      <h1 className={estilos.heroTitulo}>As compras da casa, organizadas em família.</h1>
      <p className={estilos.heroTexto}>
        Listas de compras compartilhadas: todo mundo adiciona, qualquer um marca no mercado.
      </p>
      <div className={estilos.heroAcoes}>
        <Botao variante="primario" larguraTotal onClick={() => navegar('/cadastro')}>
          Criar conta
        </Botao>
        <Botao larguraTotal onClick={() => navegar('/login')}>
          Entrar
        </Botao>
      </div>
      <ul className={estilos.recursos}>
        <li>
          <IconeCheck tamanho={18} />
          Convide a família com um código curto.
        </li>
        <li>
          <IconeCheck tamanho={18} />
          Marque itens com um toque e veja quem comprou.
        </li>
        <li>
          <IconeCheck tamanho={18} />
          Várias famílias? Alterne entre elas quando quiser.
        </li>
      </ul>
    </div>
  );
}
