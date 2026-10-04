package br.com.familyctrl.compras.dto;

import java.math.BigDecimal;

/**
 * Indicadores da tela da família.
 *
 * @param mes mês consultado (AAAA-MM)
 * @param ultimaCompra a compra mais recente da família, de qualquer mês (nula se não houver)
 */
public record ResumoMes(String mes, BigDecimal gasto, long compras, CompraResumo ultimaCompra) {
}
