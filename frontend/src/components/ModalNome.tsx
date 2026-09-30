import { useState, type FormEvent } from 'react';
import { Botao } from './Botao';
import { Campo } from './Campo';
import estilos from './Formulario.module.css';
import { Modal } from './Modal';

interface Props {
  aberto: boolean;
  titulo: string;
  rotulo: string;
  valorInicial: string;
  carregando?: boolean;
  erro?: string;
  aoSalvar: (nome: string) => void;
  aoFechar: () => void;
}

/** Modal com um único campo de nome (renomear família ou lista). */
export function ModalNome(props: Props) {
  if (!props.aberto) return null;
  // Montado só quando aberto: o campo sempre começa com o valor atual
  return <ConteudoModalNome {...props} />;
}

function ConteudoModalNome({
  titulo,
  rotulo,
  valorInicial,
  carregando,
  erro,
  aoSalvar,
  aoFechar,
}: Props) {
  const [nome, setNome] = useState(valorInicial);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nome.trim()) aoSalvar(nome.trim());
  }

  return (
    <Modal aberto titulo={titulo} aoFechar={aoFechar}>
      <form className={estilos.formulario} onSubmit={enviar}>
        <Campo
          rotulo={rotulo}
          value={nome}
          maxLength={100}
          required
          onChange={(e) => setNome(e.target.value)}
          erro={erro}
        />
        <div className={estilos.acoes}>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" carregando={carregando} disabled={!nome.trim()}>
            Salvar
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
