import { Botao } from '../components/Botao';
import { Card } from '../components/Card';
import { useAuth } from '../estado/auth';
import estilos from './Paginas.module.css';

export function Conta() {
  const { usuario, sair } = useAuth();
  return (
    <div className={estilos.pagina}>
      <div className={estilos.cabecalho}>
        <h1>Conta</h1>
      </div>
      <Card>
        <p>{usuario?.nome}</p>
        <p className={estilos.subtitulo}>{usuario?.email}</p>
      </Card>
      <Botao variante="perigo" larguraTotal onClick={sair}>
        Sair
      </Botao>
    </div>
  );
}
