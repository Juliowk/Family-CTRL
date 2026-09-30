package br.com.familyctrl.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** Credenciais de login. {@code lembrarDeMim} gera um token com validade maior. */
public record LoginRequest(@NotBlank(message = "Informe seu e-mail.") String email,
		@NotBlank(message = "Informe sua senha.") String senha, boolean lembrarDeMim) {
}
