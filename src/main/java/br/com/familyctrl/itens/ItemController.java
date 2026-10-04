package br.com.familyctrl.itens;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.familyctrl.infra.seguranca.UsuarioLogado;
import br.com.familyctrl.itens.dto.AtualizarItemRequest;
import br.com.familyctrl.itens.dto.ExtraRequest;
import br.com.familyctrl.itens.dto.ItemRequest;
import br.com.familyctrl.itens.dto.ItemResponse;
import br.com.familyctrl.itens.dto.PegarRequest;

@RestController
@RequestMapping("/api")
class ItemController {

	private final ItemService service;

	ItemController(ItemService service) {
		this.service = service;
	}

	// ------------------------------------------------------------------ planejamento

	@PostMapping("/listas/{listaId}/itens")
	@ResponseStatus(HttpStatus.CREATED)
	ItemResponse adicionar(UsuarioLogado usuario, @PathVariable Long listaId, @Valid @RequestBody ItemRequest request) {
		return service.adicionar(listaId, usuario.id(), request);
	}

	@PatchMapping("/itens/{id}")
	ItemResponse atualizar(UsuarioLogado usuario, @PathVariable Long id,
			@Valid @RequestBody AtualizarItemRequest request) {
		return service.atualizar(id, usuario.id(), request);
	}

	@DeleteMapping("/itens/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void remover(UsuarioLogado usuario, @PathVariable Long id) {
		service.remover(id, usuario.id());
	}

	// ------------------------------------------------------------------ compra em andamento

	/** Marca como pego (ou corrige os valores). PUT porque repetir a chamada dá o mesmo resultado. */
	@PutMapping("/itens/{id}/pego")
	ItemResponse pegar(UsuarioLogado usuario, @PathVariable Long id, @Valid @RequestBody PegarRequest request) {
		return service.pegar(id, usuario.id(), request);
	}

	@DeleteMapping("/itens/{id}/pego")
	ItemResponse desmarcar(UsuarioLogado usuario, @PathVariable Long id) {
		return service.desmarcar(id, usuario.id());
	}

	@PostMapping("/listas/{listaId}/itens/extra")
	@ResponseStatus(HttpStatus.CREATED)
	ItemResponse adicionarExtra(UsuarioLogado usuario, @PathVariable Long listaId,
			@Valid @RequestBody ExtraRequest request) {
		return service.adicionarExtra(listaId, usuario.id(), request);
	}

	@PostMapping("/listas/{listaId}/desmarcar-todos")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void desmarcarTodos(UsuarioLogado usuario, @PathVariable Long listaId) {
		service.desmarcarTodos(listaId, usuario.id());
	}

}
