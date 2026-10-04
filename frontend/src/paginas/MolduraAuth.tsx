import type { ReactNode } from 'react';
import { IconeCheck } from '../components/Icones';
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
        <p className={estilos.painelTitulo}>As compras da casa, organizadas em família.</p>
        <ul className={estilos.vantagens}>
          {VANTAGENS.map((vantagem) => (
            <li key={vantagem}>
              <span className={estilos.vantagemIcone} aria-hidden="true">
                <IconeCheck tamanho={14} />
              </span>
              {vantagem}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
