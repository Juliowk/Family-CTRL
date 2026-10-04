package br.com.familyctrl.listas.dto;

import java.time.Instant;

/**
 * Lista no resumo da família. {@code itensPegos} > 0 indica uma compra em andamento.
 */
public record ListaResponse(Long id, Long familiaId, String nome, Instant criadaEm, long totalItens,
		long itensPegos) {
}
