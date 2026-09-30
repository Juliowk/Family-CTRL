import type { ReactNode } from 'react';
import { ApiError } from '../api/cliente';
import { useDemorou } from '../estado/useDemorou';
import { Botao } from './Botao';
import estilos from './Estados.module.css';

/** Aviso exibido quando o servidor do Heroku está acordando (primeira requisição lenta). */
export function AvisoServidorAcordando({ ativo }: { ativo: boolean }) {
  const demorou = useDemorou(ativo);
  if (!demorou) return null;
  return (
    <p className={estilos.aviso} role="status">
      Conectando ao servidor… Na primeira vez pode levar alguns segundos.
    </p>
  );
}

/** Blocos cinza animados que ocupam o lugar do conteúdo enquanto ele carrega. */
export function Skeleton({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className={estilos.skeletons} aria-hidden="true">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className={estilos.skeleton} />
      ))}
    </div>
  );
}

/** Estado de carregamento padrão das telas. */
export function Carregando({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className={estilos.carregando}>
      <span className="sr-only" role="status">
        Carregando…
      </span>
      <AvisoServidorAcordando ativo />
      <Skeleton linhas={linhas} />
    </div>
  );
}

export function EstadoVazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className={estilos.vazio}>
      <p className={estilos.vazioTitulo}>{titulo}</p>
      {children && <div className={estilos.vazioTexto}>{children}</div>}
    </div>
  );
}

export function MensagemErro({
  erro,
  aoTentarDeNovo,
}: {
  erro: unknown;
  aoTentarDeNovo?: () => void;
}) {
  const mensagem =
    erro instanceof ApiError ? erro.message : 'Algo deu errado. Tente novamente em instantes.';
  return (
    <div className={estilos.erro} role="alert">
      <p>{mensagem}</p>
      {aoTentarDeNovo && (
        <Botao pequeno onClick={aoTentarDeNovo}>
          Tentar de novo
        </Botao>
      )}
    </div>
  );
}
