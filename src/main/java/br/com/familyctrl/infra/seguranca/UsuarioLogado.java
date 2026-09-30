package br.com.familyctrl.infra.seguranca;

/**
 * Usuário autenticado na requisição atual, extraído do JWT.
 * Basta declarar um parâmetro deste tipo em um método de controller para recebê-lo.
 */
public record UsuarioLogado(Long id) {
}
