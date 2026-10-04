package br.com.familyctrl.categorias.dto;

import java.util.List;

import jakarta.validation.constraints.NotNull;

/** Nova ordem das categorias: todos os ids da família, na ordem desejada. */
public record OrdemRequest(@NotNull(message = "Informe a ordem das categorias.") List<Long> ids) {
}
