package br.com.familyctrl.familia.dto;

import java.time.Instant;

import br.com.familyctrl.familia.Papel;

public record MembroResponse(Long usuarioId, String nome, String email, Papel papel, Instant entrouEm) {
}
