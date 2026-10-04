import type { ReactNode } from 'react';
import { SimboloLogo } from '../components/brand/Logo';
import { IconeCheck } from '../components/Icones';
import { useTema } from '../estado/tema';
import estilos from './MolduraAuth.module.css';

const VANTAGENS = [
  'Listas que a família inteira edita',
  'Um toque para marcar como comprado',
  'Convite por código curto',
];

/**
 * Moldura das telas de login e cadastro: o formulário num card e, no desktop, um painel
 * lateral lembrando o que a pessoa ganha ao entrar.
 */
export function MolduraAuth({
  rotulo,
  titulo,
  subtitulo,
  rodape,
  children,
}: {
  rotulo: string;
  titulo: string;
  subtitulo: string;
  rodape: ReactNode;
  children: ReactNode;
}) {
  const [tema] = useTema();
  return (
    <div className={estilos.moldura}>
      <div className={estilos.card}>
        <div className={estilos.cabecalho}>
          <p className={estilos.rotulo}>{rotulo}</p>
          <h1>{titulo}</h1>
          <p className={estilos.subtitulo}>{subtitulo}</p>
        </div>
        {children}
        <p className={estilos.rodape}>{rodape}</p>
      </div>
      <aside className={estilos.painel} aria-label="Por que usar">
        <SimboloLogo tema={tema} tamanho={56} />
        <p className={estilos.painelTitulo}>As compras da casa, organizadas em família.</p>
        <ul className={estilos.vantagens}>
          {VANTAGENS.map((vantagem) => (
            <li key={vantagem}>
              <span className={estilos.vantagemIcone} aria-hidden="true">
                <IconeCheck tamanho={16} />
              </span>
              {vantagem}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
