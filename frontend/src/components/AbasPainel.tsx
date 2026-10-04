import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import estilos from './AbasPainel.module.css';

export interface AbaPainel {
  rotulo: string;
  conteudo: ReactNode;
}

/**
 * Abas dentro de um card (ex.: "Entrar com código" / "Criar família"). Diferente de {@link Abas},
 * não mudam a URL: são caminhos alternativos para a mesma tarefa. Segue o padrão ARIA de abas
 * (setas esquerda/direita, Home e End trocam de aba).
 */
export function AbasPainel({ rotulo, abas }: { rotulo: string; abas: AbaPainel[] }) {
  const id = useId();
  const [ativa, setAtiva] = useState(0);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);

  function teclas(evento: KeyboardEvent) {
    const destino = {
      ArrowRight: (ativa + 1) % abas.length,
      ArrowLeft: (ativa - 1 + abas.length) % abas.length,
      Home: 0,
      End: abas.length - 1,
    }[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    setAtiva(destino);
    botoes.current[destino]?.focus();
  }

  return (
    <div className={estilos.painel}>
      <div className={estilos.abas} role="tablist" aria-label={rotulo} onKeyDown={teclas}>
        {abas.map((aba, i) => (
          <button
            key={aba.rotulo}
            ref={(el) => {
              botoes.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-aba-${i}`}
            aria-selected={i === ativa}
            aria-controls={`${id}-painel-${i}`}
            tabIndex={i === ativa ? 0 : -1}
            className={estilos.aba}
            onClick={() => setAtiva(i)}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>
      {/* Todos os painéis ficam montados (só escondidos): trocar de aba não perde o que foi digitado */}
      {abas.map((aba, i) => (
        <div
          key={aba.rotulo}
          role="tabpanel"
          id={`${id}-painel-${i}`}
          aria-labelledby={`${id}-aba-${i}`}
          hidden={i !== ativa}
          className={estilos.conteudo}
        >
          {aba.conteudo}
        </div>
      ))}
    </div>
  );
}
