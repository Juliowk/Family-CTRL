package br.com.familyctrl.listas;

import java.util.Optional;

import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.familia.FamiliaService;
import br.com.familyctrl.infra.erro.ConflitoException;
import br.com.familyctrl.infra.erro.RecursoNaoEncontradoException;

/**
 * Responde "este usuário pode acessar esta lista?" (ou seja: a lista existe e o usuário é membro
 * da família dona dela) e coordena as alterações simultâneas nos itens de uma lista.
 *
 * <p>Fica separado do {@link ListaService} para o módulo de itens poder usá-lo sem criar uma
 * dependência circular (ListaService já depende de ItemService para calcular o progresso).
 */
@Component
@Transactional(readOnly = true)
public class ListaAcesso {

	private static final String NAO_ENCONTRADA = "Lista não encontrada.";

	private static final String LISTA_MUDOU = "A lista mudou enquanto você a usava: outra pessoa marcou ou alterou "
			+ "itens. Os valores na tela foram atualizados; confira e tente de novo.";

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

	/**
	 * Toda alteração nos itens de uma lista começa aqui. Trava a linha da lista até o fim da
	 * transação (duas pessoas alterando a mesma lista ao mesmo tempo são atendidas uma de cada vez,
	 * sem uma apagar o que a outra fez), verifica o acesso e sobe a versão da lista.
	 *
	 * @param versaoEsperada versão da lista que a tela está mostrando; se informada e diferente da
	 * atual (alguém alterou a lista nesse meio-tempo), responde 409. Nula: não verifica.
	 * @return id da família dona da lista
	 */
	@Transactional
	public Long travarParaAlterar(Long listaId, Long usuarioId, @Nullable Long versaoEsperada) {
		Lista lista = listas.travar(listaId)
			.filter(l -> familiaService.ehMembro(l.getFamiliaId(), usuarioId))
			.orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));
		if (versaoEsperada != null && versaoEsperada != lista.getVersao()) {
			throw new ConflitoException(LISTA_MUDOU);
		}
		lista.registrarAlteracao();
		return lista.getFamiliaId();
	}

}
