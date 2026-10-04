package br.com.familyctrl.compras.dto;

import java.math.BigDecimal;

import br.com.familyctrl.itens.TipoPreco;

/** Item de uma compra concluída. {@code subtotal} nulo: sem preço (entrou no valor variável). */
public record CompraItemResponse(Long id, String nome, String categoria, int categoriaOrdem,
		String quantidadePlanejada, boolean pego, BigDecimal quantidadePega, TipoPreco tipoPreco, BigDecimal preco,
		BigDecimal subtotal, String marca, boolean extra) {
}
