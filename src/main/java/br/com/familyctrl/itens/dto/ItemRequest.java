package br.com.familyctrl.itens.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import br.com.familyctrl.itens.TipoPreco;

/**
 * Planejar um item: nome, categoria e medida (por unidade ou por kg) obrigatórios; quantidade
 * desejada opcional, na medida do item (ex.: 2 unidades ou 0,3 kg).
 */
public record ItemRequest(
		@NotBlank(message = "Informe o nome do item.") @Size(max = 120,
				message = "O nome deve ter no máximo 120 caracteres.") String nome,
		@NotNull(message = "Escolha a categoria.") Long categoriaId,
		@DecimalMin(value = "0.001", message = "A quantidade deve ser maior que zero.") @Digits(integer = 7,
				fraction = 3, message = "Quantidade inválida.") BigDecimal quantidadePlanejada,
		@NotNull(message = "Escolha a medida: por unidade ou por kg.") TipoPreco medida) {
}
