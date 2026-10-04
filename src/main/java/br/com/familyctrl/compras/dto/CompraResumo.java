package br.com.familyctrl.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Compra concluída na listagem da família ("x de y comprados", valor, data e mercado).
 * {@code exemplo} indica uma compra da lista "Exemplo Visual" (fora do resumo do mês).
 */
public record CompraResumo(Long id, Long listaId, String listaNome, String mercado, LocalDate dataCompra,
		BigDecimal valorItens, BigDecimal valorVariavel, BigDecimal valorTotal, long totalItens, long itensPegos,
		boolean exemplo) {
}
