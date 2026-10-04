package br.com.familyctrl.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

/**
 * Finalizar a compra em andamento de uma lista.
 *
 * @param valorVariavel valor dos itens sem preço, descoberto no caixa (0 se não houver)
 * @param extrasMantidos ids dos itens não planejados que passam a fazer parte da lista
 * @param versaoLista versão da lista que a tela mostrou ao calcular os valores; se outra pessoa
 * alterou a lista depois disso, a compra não é finalizada (409). Nula: não verifica.
 */
public record FinalizarRequest(
		@NotBlank(message = "Informe o mercado.") @Size(max = 100,
				message = "O mercado deve ter no máximo 100 caracteres.") String mercado,
		@NotNull(message = "Informe a data da compra.") @PastOrPresent(
				message = "A data da compra não pode ser no futuro.") LocalDate dataCompra,
		@NotNull(message = "Informe o valor dos itens sem preço (0 se não houver).") @DecimalMin(value = "0.00",
				message = "O valor não pode ser negativo.") @Digits(integer = 8, fraction = 2,
						message = "Valor inválido.") BigDecimal valorVariavel,
		List<Long> extrasMantidos, Long versaoLista) {
}
