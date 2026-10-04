package br.com.familyctrl.listas.dto;

import java.time.Instant;
import java.util.List;

import br.com.familyctrl.categorias.dto.CategoriaResponse;
import br.com.familyctrl.itens.dto.ItemResponse;

/**
 * Lista com as categorias da família (na ordem configurada) e todos os itens. O agrupamento dos
 * itens por categoria é feito na tela.
 */
public record ListaDetalhe(Long id, Long familiaId, String nome, Instant criadaEm,
		List<CategoriaResponse> categorias, List<ItemResponse> itens) {
}
