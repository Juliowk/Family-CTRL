import { useId } from 'react';
import type { Categoria } from '../api/tipos';
import { IconeCheck } from './Icones';
import estilos from './SeletorCategoria.module.css';

interface Props {
  categorias: Categoria[];
  valor: number;
  aoMudar: (id: number) => void;
  rotulo?: string;
  erro?: string;
}

/**
 * Escolha da categoria em cards pequenos, que quebram linha conforme o espaço. Por baixo são
 * radios nativos: setas do teclado navegam entre as opções e leitores de tela anunciam o grupo.
 */
export function SeletorCategoria({
  categorias,
  valor,
  aoMudar,
  rotulo = 'Categoria',
  erro,
}: Props) {
  const nome = useId();
  const idErro = erro ? `${nome}-erro` : undefined;
  return (
    <fieldset className={estilos.grupo} aria-describedby={idErro}>
      <legend className={estilos.rotulo}>{rotulo}</legend>
      <div className={estilos.opcoes}>
        {categorias.map((categoria) => {
          const marcada = categoria.id === valor;
          return (
            <label key={categoria.id} className={estilos.opcao} data-marcada={marcada}>
              <input
                type="radio"
                name={nome}
                value={categoria.id}
                checked={marcada}
                onChange={() => aoMudar(categoria.id)}
                className="sr-only"
              />
              {marcada && <IconeCheck tamanho={16} />}
              {categoria.nome}
            </label>
          );
        })}
      </div>
      {erro && (
        <p id={idErro} className={estilos.erro}>
          {erro}
        </p>
      )}
    </fieldset>
  );
}
