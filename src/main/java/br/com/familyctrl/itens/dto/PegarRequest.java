package br.com.familyctrl.itens.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import br.com.familyctrl.itens.TipoPreco;

/**
 * Marcar um item como pego (ou corrigir os valores de um item já pego). Só o preço é obrigatório:
 * com ele o total da compra é sempre conhecido. Sem tipo, vale "por unidade"; com {@code KG}, a
 * quantidade é o peso e o preço é o total pago por ele. {@code versao}: a versão do item que a
 * tela mostra (nula: não verifica).
 */
public record PegarRequest(
		@DecimalMin(value = "0.001", message = "A quantidade deve ser maior que zero.") @Digits(integer = 7,
				fraction = 3, message = "Quantidade inválida.") BigDecimal quantidadePega,
		TipoPreco tipoPreco,
		@NotNull(message = "Informe o preço.") @DecimalMin(value = "0.00",
				message = "O preço não pode ser negativo.") @Digits(integer = 8, fraction = 2,
						message = "Preço inválido.") BigDecimal preco,
		@Size(max = 60, message = "A marca deve ter no máximo 60 caracteres.") String marca,
		Long versao) {
}
