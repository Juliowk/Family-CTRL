package br.com.familyctrl.familia.dto;

import java.time.Instant;
import java.util.List;

import br.com.familyctrl.familia.Papel;

/** Família com membros e código de convite (tela da família). */
public record FamiliaDetalhe(Long id, String nome, String codigoConvite, Papel meuPapel, Instant criadoEm,
		List<MembroResponse> membros) {
}
