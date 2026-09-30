import { useEffect } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/cliente';
import { EstadoVazio, MensagemErro } from '../components/Estados';
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
    <EstadoVazio titulo="Família não encontrada">
      Ela pode ter sido excluída ou você não participa mais dela.{' '}
      <Link to="/familias">Ver suas famílias</Link>
    </EstadoVazio>
  );
}
