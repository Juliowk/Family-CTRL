package br.com.familyctrl.itens.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import br.com.familyctrl.itens.TipoPreco;

/**
 * Planejar um item: nome, categoria e medida (por unidade ou por kg) obrigatórios; quantidade
 * desejada opcional (ex.: "2 kg").
 */
public record ItemRequest(
		@NotBlank(message = "Informe o nome do item.") @Size(max = 120,
				message = "O nome deve ter no máximo 120 caracteres.") String nome,
		@NotNull(message = "Escolha a categoria.") Long categoriaId,
		@Size(max = 30, message = "A quantidade deve ter no máximo 30 caracteres.") String quantidadePlanejada,
		@NotNull(message = "Escolha a medida: por unidade ou por kg.") TipoPreco medida) {
}
