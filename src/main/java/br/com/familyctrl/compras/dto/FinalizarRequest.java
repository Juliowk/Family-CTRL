package br.com.familyctrl.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

/**
 * Finalizar a compra em andamento de uma lista. Só o valor final pago é obrigatório (a tela já
 * envia a data de hoje como padrão).
 *
 * @param valorTotal valor final pago, o do cupom do caixa. Pode ser diferente da soma dos itens:
 * menor é desconto, maior é acréscimo (ou itens sem preço)
 * @param mercado opcional
 * @param extrasMantidos ids dos itens não planejados que passam a fazer parte da lista
 * @param versaoLista versão da lista que a tela mostrou ao calcular os valores; se outra pessoa
 * alterou a lista depois disso, a compra não é finalizada (409). Nula: não verifica.
 */
public record FinalizarRequest(
		@NotNull(message = "Informe o valor final pago.") @DecimalMin(value = "0.00",
				message = "O valor não pode ser negativo.") @Digits(integer = 8, fraction = 2,
						message = "Valor inválido.") BigDecimal valorTotal,
		@Size(max = 100, message = "O mercado deve ter no máximo 100 caracteres.") String mercado,
		@NotNull(message = "Informe a data da compra.") @PastOrPresent(
				message = "A data da compra não pode ser no futuro.") LocalDate dataCompra,
		List<Long> extrasMantidos, Long versaoLista) {
}
