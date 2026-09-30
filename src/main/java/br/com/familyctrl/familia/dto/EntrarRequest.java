package br.com.familyctrl.familia.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Entrar em uma família pelo código de convite. */
public record EntrarRequest(@NotBlank(message = "Informe o código de convite.") @Size(max = 12,
		message = "Código de convite inválido.") String codigo) {
}
