import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { sugestoesApi } from '../api/endpoints';
import type { SugestaoItem } from '../api/tipos';
import { chaves } from '../estado/chaves';

/**
 * Categoria e medida sugeridas pelo nome do produto (histórico da família, dicionário ou IA).
 * Espera a pessoa parar de digitar ({@link atrasoMs}) antes de perguntar à API, e cada nome é
 * consultado uma vez só por sessão. Devolve undefined enquanto não há sugestão para o nome atual.
 */
export function useSugestaoItem(
  familiaId: number,
  nome: string,
  atrasoMs = 400,
): SugestaoItem | undefined {
  const atual = nome.trim();
  const [estavel, setEstavel] = useState(atual);

  useEffect(() => {
    const espera = setTimeout(() => setEstavel(atual), atrasoMs);
    return () => clearTimeout(espera);
  }, [atual, atrasoMs]);

  const sugestao = useQuery({
    queryKey: chaves.sugestao(familiaId, estavel.toLowerCase()),
    queryFn: () => sugestoesApi.item(familiaId, estavel),
    enabled: estavel.length >= 2,
    // Uma sugestão não muda enquanto a tela está aberta, e errar aqui não pode atrapalhar
    staleTime: Infinity,
    retry: false,
  });
  return estavel === atual ? sugestao.data : undefined;
}
