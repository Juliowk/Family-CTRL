import { Botao } from '../components/Botao';
import estilos from './AvisoSincronia.module.css';

/**
 * Avisos da sincronização da lista entre aparelhos:
 * - sem conexão: a última busca falhou, então o que está na tela pode não ser o mais recente;
 * - aviso: uma alteração foi recusada porque outra pessoa mudou o item (ou a lista) antes.
 */
export function AvisoSincronia({
  semConexao,
  aviso,
  aoFecharAviso,
}: {
  semConexao: boolean;
  aviso?: string;
  aoFecharAviso: () => void;
}) {
  return (
    <>
      {semConexao && (
        <p className={estilos.aviso} role="status">
          Sem conexão com o servidor. Os valores podem estar desatualizados; tentando de novo…
        </p>
      )}
      {aviso && (
        <div className={estilos.aviso} role="alert">
          <p>{aviso}</p>
          <Botao pequeno variante="fantasma" onClick={aoFecharAviso}>
            Ok
          </Botao>
        </div>
      )}
    </>
  );
}
