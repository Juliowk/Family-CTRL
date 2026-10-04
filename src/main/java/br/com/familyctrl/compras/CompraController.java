package br.com.familyctrl.compras;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.familyctrl.compras.dto.CompraDetalhe;
import br.com.familyctrl.compras.dto.CompraResumo;
import br.com.familyctrl.compras.dto.FinalizarRequest;
import br.com.familyctrl.compras.dto.ResumoMes;
import br.com.familyctrl.infra.seguranca.UsuarioLogado;

@RestController
@RequestMapping("/api")
class CompraController {

	private final CompraService service;

	CompraController(CompraService service) {
		this.service = service;
	}

	/** Finaliza a compra em andamento da lista (cria a compra concluída e zera a lista). */
	@PostMapping("/listas/{listaId}/compras")
	@ResponseStatus(HttpStatus.CREATED)
	CompraDetalhe finalizar(UsuarioLogado usuario, @PathVariable Long listaId,
			@Valid @RequestBody FinalizarRequest request) {
		return service.finalizar(listaId, usuario.id(), request);
	}

	@GetMapping("/familias/{familiaId}/compras")
	List<CompraResumo> listar(UsuarioLogado usuario, @PathVariable Long familiaId) {
		return service.listar(familiaId, usuario.id());
	}

	/** Indicadores do mês: {@code ?mes=AAAA-MM}. */
	@GetMapping("/familias/{familiaId}/compras/resumo")
	ResumoMes resumo(UsuarioLogado usuario, @PathVariable Long familiaId, @RequestParam String mes) {
		return service.resumo(familiaId, usuario.id(), mes);
	}

	@GetMapping("/compras/{id}")
	CompraDetalhe detalhar(UsuarioLogado usuario, @PathVariable Long id) {
		return service.detalhar(id, usuario.id());
	}

}
