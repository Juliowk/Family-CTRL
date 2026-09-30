package br.com.familyctrl.itens;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.auth.UsuarioService;
import br.com.familyctrl.auth.dto.UsuarioResponse;
import br.com.familyctrl.infra.erro.RecursoNaoEncontradoException;
import br.com.familyctrl.infra.erro.ValidacaoException;
import br.com.familyctrl.itens.dto.AtualizarItemRequest;
import br.com.familyctrl.itens.dto.ItemRequest;
import br.com.familyctrl.itens.dto.ItemResponse;
import br.com.familyctrl.itens.dto.PessoaResponse;
import br.com.familyctrl.listas.ListaAcesso;

/**
 * Regras dos itens. Toda operação verifica, via {@link ListaAcesso}, se o usuário é membro da
 * família dona da lista. Sem acesso, a resposta é 404.
 */
@Service
@Transactional
public class ItemService {

	private static final String LISTA_NAO_ENCONTRADA = "Lista não encontrada.";

	private static final String ITEM_NAO_ENCONTRADO = "Item não encontrado.";

	private final ItemRepository itens;

	private final ListaAcesso listaAcesso;

	private final UsuarioService usuarioService;

	ItemService(ItemRepository itens, ListaAcesso listaAcesso, UsuarioService usuarioService) {
		this.itens = itens;
		this.listaAcesso = listaAcesso;
		this.usuarioService = usuarioService;
	}

	@Transactional(readOnly = true)
	public List<ItemResponse> listar(Long listaId, Long usuarioId) {
		verificarLista(listaId, usuarioId);
		return paraResponse(itens.findByListaIdOrderByCompradoAscCriadoEmAscIdAsc(listaId));
	}

	/**
	 * Progresso de várias listas numa só consulta. Retorna apenas contagens; quem chama
	 * (o ListaService) já verificou o acesso às listas.
	 */
	@Transactional(readOnly = true)
	public Map<Long, Progresso> progressoPorLista(Collection<Long> listaIds) {
		if (listaIds.isEmpty()) {
			return Map.of();
		}
		return itens.contarPorLista(listaIds)
			.stream()
			.collect(Collectors.toMap(ItemRepository.ProgressoLista::getListaId,
					p -> new Progresso(p.getTotal(), p.getComprados())));
	}

	public ItemResponse adicionar(Long listaId, Long usuarioId, ItemRequest request) {
		verificarLista(listaId, usuarioId);
		Item item = itens.save(new Item(listaId, request.nome().trim(), vazioParaNulo(request.quantidade()),
				vazioParaNulo(request.observacao()), usuarioId));
		return paraResponse(item);
	}

	public ItemResponse atualizar(Long itemId, Long usuarioId, AtualizarItemRequest request) {
		Item item = buscarItem(itemId, usuarioId);
		if (request.nome() != null && request.nome().isBlank()) {
			throw new ValidacaoException("nome", "Informe o nome do item.");
		}
		if (request.nome() != null || request.quantidade() != null || request.observacao() != null) {
			item.editar(request.nome() != null ? request.nome().trim() : item.getNome(),
					request.quantidade() != null ? vazioParaNulo(request.quantidade()) : item.getQuantidade(),
					request.observacao() != null ? vazioParaNulo(request.observacao()) : item.getObservacao());
		}
		if (request.comprado() != null && request.comprado() != item.isComprado()) {
			item.marcarComprado(request.comprado(), usuarioId);
		}
		return paraResponse(item);
	}

	public void remover(Long itemId, Long usuarioId) {
		itens.delete(buscarItem(itemId, usuarioId));
	}

	/** Remove todos os itens já comprados da lista. */
	public void limparComprados(Long listaId, Long usuarioId) {
		verificarLista(listaId, usuarioId);
		itens.excluirComprados(listaId);
	}

	// ---------------------------------------------------------------------------------------------

	private void verificarLista(Long listaId, Long usuarioId) {
		if (!listaAcesso.podeAcessar(listaId, usuarioId)) {
			throw new RecursoNaoEncontradoException(LISTA_NAO_ENCONTRADA);
		}
	}

	private Item buscarItem(Long itemId, Long usuarioId) {
		return itens.findById(itemId)
			.filter(item -> listaAcesso.podeAcessar(item.getListaId(), usuarioId))
			.orElseThrow(() -> new RecursoNaoEncontradoException(ITEM_NAO_ENCONTRADO));
	}

	private static String vazioParaNulo(String valor) {
		return valor == null || valor.isBlank() ? null : valor.trim();
	}

	private ItemResponse paraResponse(Item item) {
		return paraResponse(List.of(item)).getFirst();
	}

	private List<ItemResponse> paraResponse(List<Item> lista) {
		List<Long> ids = lista.stream()
			.flatMap(i -> Stream.of(i.getAdicionadoPor(), i.getCompradoPor()))
			.filter(Objects::nonNull)
			.distinct()
			.toList();
		Map<Long, UsuarioResponse> usuarios = ids.isEmpty() ? Map.of() : usuarioService.buscarPorIds(ids);
		return lista.stream()
			.map(i -> new ItemResponse(i.getId(), i.getListaId(), i.getNome(), i.getQuantidade(), i.getObservacao(),
					i.isComprado(), pessoa(usuarios, i.getCompradoPor()), pessoa(usuarios, i.getAdicionadoPor()),
					i.getCriadoEm(), i.getAtualizadoEm()))
			.toList();
	}

	private static PessoaResponse pessoa(Map<Long, UsuarioResponse> usuarios, Long id) {
		if (id == null) {
			return null;
		}
		UsuarioResponse usuario = usuarios.get(id);
		return new PessoaResponse(id, usuario != null ? usuario.nome() : null);
	}

}
