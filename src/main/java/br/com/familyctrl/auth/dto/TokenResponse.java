package br.com.familyctrl.auth.dto;

import java.time.Instant;

/** Resposta de login/cadastro: o JWT, quando ele expira e quem é o usuário. */
public record TokenResponse(String token, Instant expiraEm, UsuarioResponse usuario) {
}
