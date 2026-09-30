package br.com.familyctrl.familia;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.familyctrl.familia.dto.EntrarRequest;
import br.com.familyctrl.familia.dto.FamiliaDetalhe;
import br.com.familyctrl.familia.dto.FamiliaRequest;
import br.com.familyctrl.familia.dto.FamiliaResumo;
import br.com.familyctrl.familia.dto.PapelRequest;
import br.com.familyctrl.infra.seguranca.UsuarioLogado;

@RestController
@RequestMapping("/api/familias")
class FamiliaController {

	private final FamiliaService service;

	FamiliaController(FamiliaService service) {
		this.service = service;
	}

	@GetMapping
	List<FamiliaResumo> listar(UsuarioLogado usuario) {
		return service.listar(usuario.id());
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	FamiliaResumo criar(UsuarioLogado usuario, @Valid @RequestBody FamiliaRequest request) {
		return service.criar(usuario.id(), request.nome());
	}

	@PostMapping("/entrar")
	FamiliaResumo entrar(UsuarioLogado usuario, @Valid @RequestBody EntrarRequest request) {
		return service.entrar(usuario.id(), request.codigo());
	}

	@GetMapping("/{id}")
	FamiliaDetalhe detalhar(UsuarioLogado usuario, @PathVariable Long id) {
		return service.detalhar(id, usuario.id());
	}

	@PatchMapping("/{id}")
	FamiliaDetalhe renomear(UsuarioLogado usuario, @PathVariable Long id, @Valid @RequestBody FamiliaRequest request) {
		return service.renomear(id, usuario.id(), request.nome());
	}

	@PostMapping("/{id}/convite")
	FamiliaDetalhe novoConvite(UsuarioLogado usuario, @PathVariable Long id) {
		return service.gerarNovoConvite(id, usuario.id());
	}

	@PatchMapping("/{id}/membros/{usuarioId}")
	FamiliaDetalhe alterarPapel(UsuarioLogado usuario, @PathVariable Long id, @PathVariable Long usuarioId,
			@Valid @RequestBody PapelRequest request) {
		return service.alterarPapel(id, usuario.id(), usuarioId, request.papel());
	}

	@DeleteMapping("/{id}/membros/{usuarioId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void removerMembro(UsuarioLogado usuario, @PathVariable Long id, @PathVariable Long usuarioId) {
		service.removerMembro(id, usuario.id(), usuarioId);
	}

	@PostMapping("/{id}/sair")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void sair(UsuarioLogado usuario, @PathVariable Long id) {
		service.sair(id, usuario.id());
	}

}
