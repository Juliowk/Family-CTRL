package br.com.familyctrl.listas;

import java.util.Optional;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.familia.FamiliaService;

/**
 * Responde "este usuário pode acessar esta lista?" (ou seja: a lista existe e o usuário é membro
 * da família dona dela).
 *
 * <p>Fica separado do {@link ListaService} para o módulo de itens poder usá-lo sem criar uma
 * dependência circular (ListaService já depende de ItemService para calcular o progresso).
 */
@Component
@Transactional(readOnly = true)
public class ListaAcesso {

	private final ListaRepository listas;

	private final FamiliaService familiaService;

	ListaAcesso(ListaRepository listas, FamiliaService familiaService) {
		this.listas = listas;
		this.familiaService = familiaService;
	}

	public boolean podeAcessar(Long listaId, Long usuarioId) {
		return familiaDaLista(listaId, usuarioId).isPresent();
	}

	/** Id da família dona da lista, se o usuário for membro dela; vazio caso contrário. */
	public Optional<Long> familiaDaLista(Long listaId, Long usuarioId) {
		return listas.findById(listaId)
			.map(Lista::getFamiliaId)
			.filter(familiaId -> familiaService.ehMembro(familiaId, usuarioId));
	}

}
