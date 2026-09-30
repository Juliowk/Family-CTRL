package br.com.familyctrl.auth.dto;

/** Dados públicos do usuário (nunca inclui a senha). */
public record UsuarioResponse(Long id, String nome, String email) {
}
