package br.com.familyctrl.itens;

/** Nome de um item com a categoria e a medida que a família escolheu para ele. */
public record ItemClassificado(String nome, Long categoriaId, TipoPreco medida) {
}
