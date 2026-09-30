package br.com.familyctrl.listas.dto;

import jakarta.validation.constraints.Size;

/**
 * Atualização parcial (PATCH): campos nulos não são alterados.
 * Serve para renomear, arquivar e desarquivar.
 */
public record AtualizarListaRequest(
		@Size(max = 100, message = "O nome deve ter no máximo 100 caracteres.") String nome, Boolean arquivada) {
}
