package br.com.familyctrl.listas.dto;

import java.time.Instant;

/** Lista com o progresso (itens comprados / total). */
public record ListaResponse(Long id, Long familiaId, String nome, boolean arquivada, Instant criadaEm,
		long totalItens, long itensComprados) {
}
