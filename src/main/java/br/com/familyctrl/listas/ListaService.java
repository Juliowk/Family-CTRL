package br.com.familyctrl.listas;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.familia.FamiliaService;
import br.com.familyctrl.infra.erro.RecursoNaoEncontradoException;
import br.com.familyctrl.infra.erro.ValidacaoException;
import br.com.familyctrl.itens.ItemService;
import br.com.familyctrl.itens.Progresso;
import br.com.familyctrl.listas.dto.AtualizarListaRequest;
import br.com.familyctrl.listas.dto.ListaDetalhe;
import br.com.familyctrl.listas.dto.ListaResponse;

/**
 * Regras das listas. Qualquer membro da família pode criar, renomear, arquivar e excluir listas.
 * Sem acesso à família, a resposta é 404.
 */
@Service
@Transactional
public class ListaService {

	private static final String NAO_ENCONTRADA = "Lista não encontrada.";

	private final ListaRepository listas;

	private final FamiliaService familiaService;

	private final ItemService itemService;

	ListaService(ListaRepository listas, FamiliaService familiaService, ItemService itemService) {
		this.listas = listas;
		this.familiaService = familiaService;
		this.itemService = itemService;
	}

	@Transactional(readOnly = true)
	public List<ListaResponse> listar(Long familiaId, Long usuarioId, boolean arquivadas) {
		familiaService.verificarMembro(familiaId, usuarioId);
		List<Lista> daFamilia = listas.findByFamiliaIdAndArquivadaOrderByCriadaEmDesc(familiaId, arquivadas);
		Map<Long, Progresso> progresso = itemService
			.progressoPorLista(daFamilia.stream().map(Lista::getId).toList());
		return daFamilia.stream()
			.map(lista -> paraResponse(lista, progresso.getOrDefault(lista.getId(), Progresso.VAZIO)))
			.toList();
	}

	public ListaResponse criar(Long familiaId, Long usuarioId, String nome) {
		familiaService.verificarMembro(familiaId, usuarioId);
		Lista lista = listas.save(new Lista(familiaId, nome.trim(), usuarioId));
		return paraResponse(lista, Progresso.VAZIO);
	}

	@Transactional(readOnly = true)
	public ListaDetalhe detalhar(Long listaId, Long usuarioId) {
		Lista lista = buscar(listaId, usuarioId);
		return new ListaDetalhe(lista.getId(), lista.getFamiliaId(), lista.getNome(), lista.isArquivada(),
				lista.getCriadaEm(), itemService.listar(listaId, usuarioId));
	}

	/** Renomeia e/ou arquiva/desarquiva. */
	public ListaResponse atualizar(Long listaId, Long usuarioId, AtualizarListaRequest request) {
		Lista lista = buscar(listaId, usuarioId);
		if (request.nome() != null) {
			if (request.nome().isBlank()) {
				throw new ValidacaoException("nome", "Informe o nome da lista.");
			}
			lista.setNome(request.nome().trim());
		}
		if (request.arquivada() != null) {
			lista.setArquivada(request.arquivada());
		}
		Progresso progresso = itemService.progressoPorLista(List.of(listaId))
			.getOrDefault(listaId, Progresso.VAZIO);
		return paraResponse(lista, progresso);
	}

	/** Exclui a lista; os itens são removidos junto (ON DELETE CASCADE no banco). */
	public void excluir(Long listaId, Long usuarioId) {
		listas.delete(buscar(listaId, usuarioId));
	}

	private Lista buscar(Long listaId, Long usuarioId) {
		return listas.findById(listaId)
			.filter(lista -> familiaService.ehMembro(lista.getFamiliaId(), usuarioId))
			.orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));
	}

	private static ListaResponse paraResponse(Lista lista, Progresso progresso) {
		return new ListaResponse(lista.getId(), lista.getFamiliaId(), lista.getNome(), lista.isArquivada(),
				lista.getCriadaEm(), progresso.total(), progresso.comprados());
	}

}
