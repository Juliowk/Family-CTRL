package br.com.familyctrl.sugestoes;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.familyctrl.infra.seguranca.UsuarioLogado;
import br.com.familyctrl.sugestoes.dto.SugestaoItem;

@RestController
@RequestMapping("/api")
class SugestaoController {

	private final SugestaoService service;

	SugestaoController(SugestaoService service) {
		this.service = service;
	}

	/** Categoria e medida sugeridas para um produto: {@code ?nome=mussarela}. */
	@GetMapping("/familias/{familiaId}/sugestao-item")
	SugestaoItem sugerir(UsuarioLogado usuario, @PathVariable Long familiaId, @RequestParam String nome) {
		return service.sugerir(familiaId, usuario.id(), nome);
	}

}
