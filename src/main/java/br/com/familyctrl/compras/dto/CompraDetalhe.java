package br.com.familyctrl.compras.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Compra concluída com todos os itens (ordenados por categoria). */
public record CompraDetalhe(Long id, Long familiaId, Long listaId, String listaNome, String mercado,
		LocalDate dataCompra, BigDecimal valorItens, BigDecimal valorVariavel, BigDecimal valorTotal,
		long totalItens, long itensPegos, String finalizadaPor, Instant finalizadaEm, List<CompraItemResponse> itens) {
}
