import { Botao } from './Botao';
import { Modal } from './Modal';
import estilos from './Formulario.module.css';

interface Props {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  carregando?: boolean;
  erro?: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

/** Confirmação para ações destrutivas (excluir, remover, sair). */
export function ConfirmarDialogo({
  aberto,
  titulo,
  mensagem,
  textoConfirmar,
  carregando,
  erro,
  aoConfirmar,
  aoCancelar,
}: Props) {
  return (
    <Modal aberto={aberto} titulo={titulo} aoFechar={aoCancelar}>
      <p className={estilos.texto}>{mensagem}</p>
      {erro && (
        <p className={estilos.erro} role="alert">
          {erro}
        </p>
      )}
      <div className={estilos.acoes}>
        <Botao variante="fantasma" onClick={aoCancelar}>
          Cancelar
        </Botao>
        <Botao variante="perigo" carregando={carregando} onClick={aoConfirmar}>
          {textoConfirmar}
        </Botao>
      </div>
    </Modal>
  );
}
