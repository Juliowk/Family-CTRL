package br.com.familyctrl.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Dados de cadastro. A senha tem no máximo 72 caracteres porque o BCrypt ignora o que passa
 * de 72 bytes.
 */
public record CadastroRequest(
		@NotBlank(message = "Informe seu nome.") @Size(max = 100, message = "O nome deve ter no máximo 100 caracteres.") String nome,
		@NotBlank(message = "Informe seu e-mail.") @Email(message = "E-mail inválido.") @Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres.") String email,
		@NotBlank(message = "Informe uma senha.") @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.") String senha,
		@NotBlank(message = "Confirme a senha.") String confirmacaoSenha) {
}
