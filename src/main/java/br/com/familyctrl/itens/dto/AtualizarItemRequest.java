package br.com.familyctrl.itens.dto;

import jakarta.validation.constraints.Size;

/**
 * Atualização parcial (PATCH) de um item. Campos nulos não são alterados.
 * Para apagar quantidade ou observação, envie uma string vazia.
 */
public record AtualizarItemRequest(
		@Size(max = 120, message = "O nome deve ter no máximo 120 caracteres.") String nome,
		@Size(max = 30, message = "A quantidade deve ter no máximo 30 caracteres.") String quantidade,
		@Size(max = 255, message = "A observação deve ter no máximo 255 caracteres.") String observacao,
		Boolean comprado) {
}
