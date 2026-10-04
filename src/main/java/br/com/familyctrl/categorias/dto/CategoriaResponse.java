package br.com.familyctrl.categorias.dto;

/** Categoria. {@code fixa} indica a "Outros", que não pode ser excluída nem renomeada. */
public record CategoriaResponse(Long id, String nome, int ordem, boolean fixa) {
}
