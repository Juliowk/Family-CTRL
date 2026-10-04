package br.com.familyctrl.itens;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.auth.UsuarioService;
import br.com.familyctrl.auth.dto.UsuarioResponse;
import br.com.familyctrl.categorias.CategoriaExcluida;
import br.com.familyctrl.categorias.CategoriaService;
import br.com.familyctrl.infra.erro.RecursoNaoEncontradoException;
import br.com.familyctrl.infra.erro.ValidacaoException;
import br.com.familyctrl.itens.dto.AtualizarItemRequest;
import br.com.familyctrl.itens.dto.ExtraRequest;
import br.com.familyctrl.itens.dto.ItemRequest;
import br.com.familyctrl.itens.dto.ItemResponse;
import br.com.familyctrl.itens.dto.PegarRequest;
import br.com.familyctrl.itens.dto.PessoaResponse;
import br.com.familyctrl.listas.ListaAcesso;

/**
 * Regras dos itens: planejamento (nome, categoria, quantidade desejada) e compra em andamento
 * (pegar, desmarcar, itens não planejados). Toda operação verifica, via {@link ListaAcesso}, se o
 * usuário é membro da família dona da lista. Sem acesso, a resposta é 404.
 */
@Service
@Transactional
public class ItemService {

	private static final String LISTA_NAO_ENCONTRADA = "Lista não encontrada.";

	private static final String ITEM_NAO_ENCONTRADO = "Item não encontrado.";

	private final ItemRepository itens;

	private final ListaAcesso listaAcesso;

	private final CategoriaService categoriaService;

	private final UsuarioService usuarioService;

	ItemService(ItemRepository itens, ListaAcesso listaAcesso, CategoriaService categoriaService,
			UsuarioService usuarioService) {
		this.itens = itens;
		this.listaAcesso = listaAcesso;
		this.categoriaService = categoriaService;
		this.usuarioService = usuarioService;
	}

	/**
	 * Itens de uma lista, na ordem em que foram adicionados. Uso interno de outros módulos (listas
	 * e compras), que já verificaram o acesso.
	 */
	@Transactional(readOnly = true)
	public List<ItemResponse> listarDaLista(Long listaId) {
		return paraResponse(itens.findByListaIdOrderByCriadoEmAscIdAsc(listaId));
	}

	/** Quantos itens e quantos pegos por lista, numa só consulta. Quem chama já verificou o acesso. */
	@Transactional(readOnly = true)
	public Map<Long, Progresso> progressoPorLista(Collection<Long> listaIds) {
		if (listaIds.isEmpty()) {
			return Map.of();
		}
		return itens.contarPorLista(listaIds)
			.stream()
			.collect(Collectors.toMap(ItemRepository.ContagemLista::getListaId,
					c -> new Progresso(c.getTotal(), c.getPegos())));
	}

	// ------------------------------------------------------------------ planejamento

	public ItemResponse adicionar(Long listaId, Long usuarioId, ItemRequest request) {
		Long familiaId = familiaDaLista(listaId, usuarioId);
		categoriaService.verificarDaFamilia(request.categoriaId(), familiaId);
		Item item = itens.save(new Item(listaId, request.categoriaId(), request.nome().trim(),
				vazioParaNulo(request.quantidadePlanejada()), request.medida(), false, usuarioId));
		return paraResponse(item);
	}

	/**
	 * Adiciona vários itens planejados de uma vez (importação). Uso interno do módulo de listas,
	 * que já verificou o acesso à família e acabou de criar a lista.
	 */
	public void importar(Long listaId, Long familiaId, Long usuarioId, List<ItemRequest> requests) {
		Set<Long> categoriasDaFamilia = categoriaService.mapaDaFamilia(familiaId).keySet();
		List<Item> novos = new ArrayList<>();
		for (int i = 0; i < requests.size(); i++) {
			ItemRequest request = requests.get(i);
			if (!categoriasDaFamilia.contains(request.categoriaId())) {
				throw new ValidacaoException("itens[" + i + "].categoriaId", "Escolha uma categoria válida.");
			}
			novos.add(new Item(listaId, request.categoriaId(), request.nome().trim(),
					vazioParaNulo(request.quantidadePlanejada()), request.medida(), false, usuarioId));
		}
		itens.saveAll(novos);
	}

	public ItemResponse atualizar(Long itemId, Long usuarioId, AtualizarItemRequest request) {
		Item item = buscarItem(itemId, usuarioId);
		if (request.nome() != null && request.nome().isBlank()) {
			throw new ValidacaoException("nome", "Informe o nome do item.");
		}
		if (request.categoriaId() != null) {
			categoriaService.verificarDaFamilia(request.categoriaId(), familiaDaLista(item.getListaId(), usuarioId));
		}
		item.editarPlanejamento(request.nome() != null ? request.nome().trim() : item.getNome(),
				request.categoriaId() != null ? request.categoriaId() : item.getCategoriaId(),
				request.quantidadePlanejada() != null ? vazioParaNulo(request.quantidadePlanejada())
						: item.getQuantidadePlanejada(),
				request.medida() != null ? request.medida() : item.getMedida());
		return paraResponse(item);
	}

	public void remover(Long itemId, Long usuarioId) {
		itens.delete(buscarItem(itemId, usuarioId));
	}

	// ------------------------------------------------------------------ compra em andamento

	/** Marca como pego com quantidade, preço e marca (todos opcionais), ou corrige esses valores. */
	public ItemResponse pegar(Long itemId, Long usuarioId, PegarRequest request) {
		Item item = buscarItem(itemId, usuarioId);
		item.pegar(request.quantidadePega(), tipoOuPadrao(request.tipoPreco()), request.preco(),
				vazioParaNulo(request.marca()), usuarioId);
		return paraResponse(item);
	}

	/** Desmarca e apaga quantidade, preço e marca. */
	public ItemResponse desmarcar(Long itemId, Long usuarioId) {
		Item item = buscarItem(itemId, usuarioId);
		item.desmarcar();
		return paraResponse(item);
	}

	/** Item não planejado encontrado no mercado: entra na categoria escolhida já como pego. */
	public ItemResponse adicionarExtra(Long listaId, Long usuarioId, ExtraRequest request) {
		Long familiaId = familiaDaLista(listaId, usuarioId);
		categoriaService.verificarDaFamilia(request.categoriaId(), familiaId);
		Item item = new Item(listaId, request.categoriaId(), request.nome().trim(), null,
				tipoOuPadrao(request.tipoPreco()), true, usuarioId);
		item.pegar(request.quantidadePega(), tipoOuPadrao(request.tipoPreco()), request.preco(),
				vazioParaNulo(request.marca()), usuarioId);
		return paraResponse(itens.save(item));
	}

	/** Desmarca todos os itens da lista, apagando quantidades, preços e marcas. */
	public void desmarcarTodos(Long listaId, Long usuarioId) {
		familiaDaLista(listaId, usuarioId);
		itens.findByListaIdOrderByCriadoEmAscIdAsc(listaId).stream().filter(Item::isPego).forEach(Item::desmarcar);
	}

	/**
	 * Depois de finalizar a compra: a lista volta zerada. Itens não planejados ficam na lista só se
	 * estiverem em {@code extrasMantidos} (aí passam a ser planejados); os demais são removidos.
	 * Uso interno do módulo de compras, que já verificou o acesso.
	 */
	public void zerarAposCompra(Long listaId, Set<Long> extrasMantidos) {
		for (Item item : itens.findByListaIdOrderByCriadoEmAscIdAsc(listaId)) {
			if (item.isExtra() && !extrasMantidos.contains(item.getId())) {
				itens.delete(item);
				continue;
			}
			if (item.isExtra()) {
				item.tornarPlanejado();
			}
			item.desmarcar();
		}
	}

	/** Categoria excluída: os itens dela vão para "Outros". Roda na mesma transação da exclusão. */
	@EventListener
	void aoExcluirCategoria(CategoriaExcluida evento) {
		itens.moverCategoria(evento.categoriaId(), evento.destinoId());
	}

	// ---------------------------------------------------------------------------------------------

	private Long familiaDaLista(Long listaId, Long usuarioId) {
		return listaAcesso.familiaDaLista(listaId, usuarioId)
			.orElseThrow(() -> new RecursoNaoEncontradoException(LISTA_NAO_ENCONTRADA));
	}

	private Item buscarItem(Long itemId, Long usuarioId) {
		return itens.findById(itemId)
			.filter(item -> listaAcesso.podeAcessar(item.getListaId(), usuarioId))
			.orElseThrow(() -> new RecursoNaoEncontradoException(ITEM_NAO_ENCONTRADO));
	}

	private static TipoPreco tipoOuPadrao(TipoPreco tipo) {
		return tipo != null ? tipo : TipoPreco.UNIDADE;
	}

	private static String vazioParaNulo(String valor) {
		return valor == null || valor.isBlank() ? null : valor.trim();
	}

	private ItemResponse paraResponse(Item item) {
		return paraResponse(List.of(item)).getFirst();
	}

	private List<ItemResponse> paraResponse(List<Item> lista) {
		List<Long> ids = lista.stream()
			.flatMap(i -> Stream.of(i.getAdicionadoPor(), i.getPegoPor()))
			.filter(Objects::nonNull)
			.distinct()
			.toList();
		Map<Long, UsuarioResponse> usuarios = ids.isEmpty() ? Map.of() : usuarioService.buscarPorIds(ids);
		return lista.stream()
			.map(i -> new ItemResponse(i.getId(), i.getListaId(), i.getCategoriaId(), i.getNome(),
					i.getQuantidadePlanejada(), i.getMedida(), i.isPego(), i.getPegoEm(), pessoa(usuarios, i.getPegoPor()),
					i.getQuantidadePega(), i.getTipoPreco(), i.getPreco(), i.subtotal(), i.getMarca(), i.isExtra(),
					pessoa(usuarios, i.getAdicionadoPor()), i.getCriadoEm(), i.getAtualizadoEm()))
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
