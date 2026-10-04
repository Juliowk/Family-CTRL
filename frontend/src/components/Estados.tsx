import type { ReactNode } from 'react';
import { ApiError } from '../api/cliente';
import { useDemorou } from '../estado/useDemorou';
import { Botao } from './Botao';
import estilos from './Estados.module.css';
import { IconeAlerta } from './Icones';

/** Aviso exibido quando o servidor do Heroku está acordando (primeira requisição lenta). */
export function AvisoServidorAcordando({ ativo }: { ativo: boolean }) {
  const demorou = useDemorou(ativo);
  if (!demorou) return null;
  return (
    <p className={estilos.aviso} role="status">
      <span className={estilos.avisoPonto} aria-hidden="true" />
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

/** Estado vazio: ícone, título, texto curto e (opcional) a ação que resolve o vazio. */
export function EstadoVazio({
  titulo,
  icone,
  acao,
  children,
}: {
  titulo: string;
  icone?: ReactNode;
  acao?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={estilos.vazio}>
      {icone && (
        <span className={estilos.vazioIcone} aria-hidden="true">
          {icone}
        </span>
      )}
      <p className={estilos.vazioTitulo}>{titulo}</p>
      {children && <div className={estilos.vazioTexto}>{children}</div>}
      {acao && <div className={estilos.vazioAcao}>{acao}</div>}
    </div>
  );
}

/** Erro: o que houve e como tentar de novo. Borda esquerda vermelha indica o estado pela forma. */
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
      <IconeAlerta tamanho={20} />
      <div className={estilos.erroCorpo}>
        <p className={estilos.erroTitulo}>Não foi possível carregar</p>
        <p className={estilos.erroTexto}>{mensagem}</p>
        {aoTentarDeNovo && (
          <Botao pequeno onClick={aoTentarDeNovo}>
            Tentar de novo
          </Botao>
        )}
      </div>
    </div>
  );
}
