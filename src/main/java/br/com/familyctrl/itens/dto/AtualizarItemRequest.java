package br.com.familyctrl.itens.dto;

import jakarta.validation.constraints.Size;

/**
 * Edição parcial (PATCH) do planejamento de um item. Campos nulos não são alterados.
 * Para apagar a quantidade desejada, envie uma string vazia.
 */
public record AtualizarItemRequest(
		@Size(max = 120, message = "O nome deve ter no máximo 120 caracteres.") String nome, Long categoriaId,
		@Size(max = 30, message = "A quantidade deve ter no máximo 30 caracteres.") String quantidadePlanejada) {
}
