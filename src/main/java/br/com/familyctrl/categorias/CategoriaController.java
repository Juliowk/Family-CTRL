package br.com.familyctrl.categorias;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.familyctrl.categorias.dto.CategoriaRequest;
import br.com.familyctrl.categorias.dto.CategoriaResponse;
import br.com.familyctrl.categorias.dto.OrdemRequest;
import br.com.familyctrl.infra.seguranca.UsuarioLogado;

@RestController
@RequestMapping("/api")
class CategoriaController {

	private final CategoriaService service;

	CategoriaController(CategoriaService service) {
		this.service = service;
	}

	@GetMapping("/familias/{familiaId}/categorias")
	List<CategoriaResponse> listar(UsuarioLogado usuario, @PathVariable Long familiaId) {
		return service.listar(familiaId, usuario.id());
	}

	@PostMapping("/familias/{familiaId}/categorias")
	@ResponseStatus(HttpStatus.CREATED)
	CategoriaResponse criar(UsuarioLogado usuario, @PathVariable Long familiaId,
			@Valid @RequestBody CategoriaRequest request) {
		return service.criar(familiaId, usuario.id(), request.nome());
	}

	@PutMapping("/familias/{familiaId}/categorias/ordem")
	List<CategoriaResponse> reordenar(UsuarioLogado usuario, @PathVariable Long familiaId,
			@Valid @RequestBody OrdemRequest request) {
		return service.reordenar(familiaId, usuario.id(), request.ids());
	}

	@PatchMapping("/categorias/{id}")
	CategoriaResponse renomear(UsuarioLogado usuario, @PathVariable Long id,
			@Valid @RequestBody CategoriaRequest request) {
		return service.renomear(id, usuario.id(), request.nome());
	}

	@DeleteMapping("/categorias/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void excluir(UsuarioLogado usuario, @PathVariable Long id) {
		service.excluir(id, usuario.id());
	}

}
