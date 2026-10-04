package br.com.familyctrl.listas.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import br.com.familyctrl.itens.dto.ItemRequest;

/**
 * Criar uma lista já com itens (importação de CSV). O front lê o CSV e resolve as categorias pelo
 * nome; aqui chegam só dados estruturados, validados como se cada item fosse adicionado à mão.
 */
public record ImportarListaRequest(
		@NotBlank(message = "Informe o nome da lista.") @Size(max = 100,
				message = "O nome deve ter no máximo 100 caracteres.") String nome,
		@NotEmpty(message = "Informe ao menos um item.") @Size(max = 300,
				message = "Importe no máximo 300 itens por vez.") List<@Valid ItemRequest> itens) {
}
