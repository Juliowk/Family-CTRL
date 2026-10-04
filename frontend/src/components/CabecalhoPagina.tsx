import type { ReactNode } from 'react';
import { Link } from 'react-router';
import estilos from './CabecalhoPagina.module.css';
import { IconeVoltar } from './Icones';

export interface Passo {
  rotulo: string;
  para: string;
}

interface Props {
  /** Caminho até a página atual (sem ela). No desktop vira breadcrumb; no celular, "‹ voltar". */
  trilha?: Passo[];
  /** Rótulo pequeno em caixa alta acima do título (contexto da página). */
  rotulo?: string;
  titulo: string;
  descricao?: ReactNode;
  /** Selos de estado ao lado do título. */
  selos?: ReactNode;
  /** Ações da página, à direita no desktop. */
  acoes?: ReactNode;
}

/** Cabeçalho padrão de toda página logada: onde estou, o que é e o que posso fazer. */
export function CabecalhoPagina({ trilha, rotulo, titulo, descricao, selos, acoes }: Props) {
  const anterior = trilha?.at(-1);
  return (
    <header className={estilos.cabecalho}>
      {trilha && trilha.length > 0 && (
        <nav aria-label="Você está em" className={estilos.trilha}>
          <ol>
            {trilha.map((passo) => (
              <li key={passo.para}>
                <Link to={passo.para}>{passo.rotulo}</Link>
                <span aria-hidden="true">›</span>
              </li>
            ))}
            <li aria-current="page">{titulo}</li>
          </ol>
        </nav>
      )}
      {anterior && (
        <Link to={anterior.para} className={estilos.voltar}>
          <IconeVoltar tamanho={18} />
          {anterior.rotulo}
        </Link>
      )}
      <div className={estilos.linha}>
        <div className={estilos.textos}>
          {rotulo && <p className={estilos.rotulo}>{rotulo}</p>}
          <div className={estilos.tituloLinha}>
            <h1>{titulo}</h1>
            {selos}
          </div>
          {descricao && <p className={estilos.descricao}>{descricao}</p>}
        </div>
        {acoes && <div className={estilos.acoes}>{acoes}</div>}
      </div>
    </header>
  );
}
