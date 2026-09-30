package br.com.familyctrl.familia.dto;

import jakarta.validation.constraints.NotNull;

import br.com.familyctrl.familia.Papel;

/** Alterar o papel de um membro (promover a ADMIN ou rebaixar a MEMBRO). */
public record PapelRequest(@NotNull(message = "Informe o papel.") Papel papel) {
}
