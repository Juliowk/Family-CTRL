package br.com.familyctrl.itens.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Adicionar um item. Quantidade e observação são opcionais. */
public record ItemRequest(
		@NotBlank(message = "Informe o nome do item.") @Size(max = 120, message = "O nome deve ter no máximo 120 caracteres.") String nome,
		@Size(max = 30, message = "A quantidade deve ter no máximo 30 caracteres.") String quantidade,
		@Size(max = 255, message = "A observação deve ter no máximo 255 caracteres.") String observacao) {
}
