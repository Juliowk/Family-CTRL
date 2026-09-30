package br.com.familyctrl.familia.dto;

import br.com.familyctrl.familia.Papel;

/** Família na listagem "minhas famílias". */
public record FamiliaResumo(Long id, String nome, Papel meuPapel, long totalMembros) {
}
