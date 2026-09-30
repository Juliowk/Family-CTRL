package br.com.familyctrl.listas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Criar uma lista. */
public record ListaRequest(@NotBlank(message = "Informe o nome da lista.") @Size(max = 100,
		message = "O nome deve ter no máximo 100 caracteres.") String nome) {
}
