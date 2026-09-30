package br.com.familyctrl.listas;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.familyctrl.infra.seguranca.UsuarioLogado;
import br.com.familyctrl.listas.dto.AtualizarListaRequest;
import br.com.familyctrl.listas.dto.ListaDetalhe;
import br.com.familyctrl.listas.dto.ListaRequest;
import br.com.familyctrl.listas.dto.ListaResponse;

@RestController
@RequestMapping("/api")
class ListaController {

	private final ListaService service;

	ListaController(ListaService service) {
		this.service = service;
	}

	/** Listas da família. Por padrão só as ativas; use {@code ?arquivadas=true} para as arquivadas. */
	@GetMapping("/familias/{familiaId}/listas")
	List<ListaResponse> listar(UsuarioLogado usuario, @PathVariable Long familiaId,
			@RequestParam(defaultValue = "false") boolean arquivadas) {
		return service.listar(familiaId, usuario.id(), arquivadas);
	}

	@PostMapping("/familias/{familiaId}/listas")
	@ResponseStatus(HttpStatus.CREATED)
	ListaResponse criar(UsuarioLogado usuario, @PathVariable Long familiaId,
			@Valid @RequestBody ListaRequest request) {
		return service.criar(familiaId, usuario.id(), request.nome());
	}

	@GetMapping("/listas/{id}")
	ListaDetalhe detalhar(UsuarioLogado usuario, @PathVariable Long id) {
		return service.detalhar(id, usuario.id());
	}

	@PatchMapping("/listas/{id}")
	ListaResponse atualizar(UsuarioLogado usuario, @PathVariable Long id,
			@Valid @RequestBody AtualizarListaRequest request) {
		return service.atualizar(id, usuario.id(), request);
	}

	@DeleteMapping("/listas/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void excluir(UsuarioLogado usuario, @PathVariable Long id) {
		service.excluir(id, usuario.id());
	}

}
