import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useParams } from 'react-router';
import { familiasApi } from '../api/endpoints';
import { chaves } from '../estado/chaves';
import { definirFamiliaAtual } from '../estado/familiaAtual';

/** Lê o :familiaId da URL, marca como família atual e carrega os detalhes dela. */
export function useFamiliaDaRota() {
  const { familiaId: parametro } = useParams();
  const familiaId = Number(parametro);
  const familia = useQuery({
    queryKey: chaves.familia(familiaId),
    queryFn: () => familiasApi.detalhar(familiaId),
    enabled: Number.isFinite(familiaId),
  });

  useEffect(() => {
    if (familia.isSuccess) definirFamiliaAtual(familiaId);
  }, [familia.isSuccess, familiaId]);

  return { familiaId, familia };
}
