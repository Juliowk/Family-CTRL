package br.com.familyctrl.categorias;

/**
 * Evento publicado antes de excluir uma categoria. O módulo de itens escuta e move os itens dela
 * para {@code destinoId} ("Outros"). Com o evento, categorias não precisa conhecer itens (e itens
 * já depende de categorias para validar a categoria de um item: sem dependência circular).
 */
public record CategoriaExcluida(Long categoriaId, Long destinoId) {
}
