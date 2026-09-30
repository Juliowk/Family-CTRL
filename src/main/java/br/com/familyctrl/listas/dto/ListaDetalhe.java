package br.com.familyctrl.listas.dto;

import java.time.Instant;
import java.util.List;

import br.com.familyctrl.itens.dto.ItemResponse;

/** Lista com todos os itens (pendentes primeiro). */
public record ListaDetalhe(Long id, Long familiaId, String nome, boolean arquivada, Instant criadaEm,
		List<ItemResponse> itens) {
}
