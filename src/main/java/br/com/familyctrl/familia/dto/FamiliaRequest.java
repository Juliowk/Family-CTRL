package br.com.familyctrl.familia.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Criar ou renomear uma família. */
public record FamiliaRequest(@NotBlank(message = "Informe o nome da família.") @Size(max = 100,
		message = "O nome deve ter no máximo 100 caracteres.") String nome) {
}
