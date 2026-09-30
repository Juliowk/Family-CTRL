package br.com.familyctrl.itens.dto;

import java.time.Instant;

/** Item de lista. {@code compradoPor} é nulo enquanto o item está pendente. */
public record ItemResponse(Long id, Long listaId, String nome, String quantidade, String observacao,
		boolean comprado, PessoaResponse compradoPor, PessoaResponse adicionadoPor, Instant criadoEm,
		Instant atualizadoEm) {
}
