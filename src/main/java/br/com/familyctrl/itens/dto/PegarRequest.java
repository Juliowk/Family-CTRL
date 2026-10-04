package br.com.familyctrl.itens.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;

import br.com.familyctrl.itens.TipoPreco;

/**
 * Marcar um item como pego (ou corrigir os valores de um item já pego). Tudo é opcional: o preço
 * de frutas e verduras, por exemplo, muitas vezes só é conhecido no caixa. Sem tipo, vale
 * "por unidade"; com {@code TOTAL}, o preço é o valor total do item.
 */
public record PegarRequest(
		@DecimalMin(value = "0.001", message = "A quantidade deve ser maior que zero.") @Digits(integer = 7,
				fraction = 3, message = "Quantidade inválida.") BigDecimal quantidadePega,
		TipoPreco tipoPreco,
		@DecimalMin(value = "0.00", message = "O preço não pode ser negativo.") @Digits(integer = 8, fraction = 2,
				message = "Preço inválido.") BigDecimal preco,
		@Size(max = 60, message = "A marca deve ter no máximo 60 caracteres.") String marca) {
}
