import { useEffect } from 'react';
import { ApiError } from '../api/cliente';
import { LinkBotao } from '../components/Botao';
import { EstadoVazio, MensagemErro } from '../components/Estados';
import { IconeFamilia } from '../components/Icones';
import { esquecerFamiliaAtual } from '../estado/familiaAtual';

/** Erro ao carregar família: 404 (não existe ou não sou membro) ou falha genérica. */
export function ErroFamilia({
  erro,
  aoTentarDeNovo,
}: {
  erro: unknown;
  aoTentarDeNovo: () => void;
}) {
  const naoEncontrada = erro instanceof ApiError && erro.status === 404;

  useEffect(() => {
    if (naoEncontrada) esquecerFamiliaAtual();
  }, [naoEncontrada]);

  if (!naoEncontrada) return <MensagemErro erro={erro} aoTentarDeNovo={aoTentarDeNovo} />;
  return (
    <EstadoVazio
      icone={<IconeFamilia />}
      titulo="Família não encontrada"
      acao={<LinkBotao to="/familias">Ver suas famílias</LinkBotao>}
    >
      Ela pode ter sido excluída ou você não participa mais dela.
    </EstadoVazio>
  );
}
