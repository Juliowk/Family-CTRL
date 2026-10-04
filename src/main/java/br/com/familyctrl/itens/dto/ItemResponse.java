package br.com.familyctrl.itens.dto;

import java.math.BigDecimal;
import java.time.Instant;

import br.com.familyctrl.itens.TipoPreco;

/**
 * Item de lista: planejamento (com a {@code medida}) + estado da compra em andamento. {@code subtotal} é nulo enquanto o
 * item não foi pego ou não tem preço (valor variável, descoberto no caixa).
 */
public record ItemResponse(Long id, Long listaId, Long categoriaId, String nome, String quantidadePlanejada,
		TipoPreco medida, boolean pego, Instant pegoEm, PessoaResponse pegoPor, BigDecimal quantidadePega, TipoPreco tipoPreco,
		BigDecimal preco, BigDecimal subtotal, String marca, boolean extra, PessoaResponse adicionadoPor,
		Instant criadoEm, Instant atualizadoEm) {
}
