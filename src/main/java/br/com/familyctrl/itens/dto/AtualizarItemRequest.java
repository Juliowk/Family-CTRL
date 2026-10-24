package br.com.familyctrl.itens.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;

import br.com.familyctrl.itens.TipoPreco;

/**
 * Edição parcial (PATCH) do planejamento de um item. Campos nulos não são alterados.
 * {@code versao}: a versão do item que a tela mostra (nula: não verifica).
 */
public record AtualizarItemRequest(
		@Size(max = 120, message = "O nome deve ter no máximo 120 caracteres.") String nome, Long categoriaId,
		@DecimalMin(value = "0.001", message = "A quantidade deve ser maior que zero.") @Digits(integer = 7,
				fraction = 3, message = "Quantidade inválida.") BigDecimal quantidadePlanejada,
		TipoPreco medida, Long versao) {
}
