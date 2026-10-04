package br.com.familyctrl.itens.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import br.com.familyctrl.itens.TipoPreco;

/** Item não planejado, adicionado durante a compra: já entra como pego. */
public record ExtraRequest(
		@NotBlank(message = "Informe o nome do item.") @Size(max = 120,
				message = "O nome deve ter no máximo 120 caracteres.") String nome,
		@NotNull(message = "Escolha a categoria.") Long categoriaId,
		@DecimalMin(value = "0.001", message = "A quantidade deve ser maior que zero.") @Digits(integer = 7,
				fraction = 3, message = "Quantidade inválida.") BigDecimal quantidadePega,
		TipoPreco tipoPreco,
		@DecimalMin(value = "0.00", message = "O preço não pode ser negativo.") @Digits(integer = 8, fraction = 2,
				message = "Preço inválido.") BigDecimal preco,
		@Size(max = 60, message = "A marca deve ter no máximo 60 caracteres.") String marca) {
}
