package br.com.familyctrl.categorias.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Criar ou renomear uma categoria. */
public record CategoriaRequest(@NotBlank(message = "Informe o nome da categoria.") @Size(max = 50,
		message = "O nome deve ter no máximo 50 caracteres.") String nome) {
}
