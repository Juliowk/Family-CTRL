package br.com.familyctrl.itens;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.PageRequest;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.auth.UsuarioService;
import br.com.familyctrl.auth.dto.UsuarioResponse;
import br.com.familyctrl.categorias.CategoriaExcluida;
import br.com.familyctrl.categorias.CategoriaService;
import br.com.familyctrl.infra.erro.ConflitoException;
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
 *
 * <p>Várias pessoas podem usar a mesma lista ao mesmo tempo, cada uma no seu aparelho. Por isso toda
 * alteração (1) trava a lista até o fim da transação ({@link ListaAcesso#travarParaAlterar}), para as
 * alterações serem aplicadas uma de cada vez, e (2) quando a tela informa a versão do item que está
 * mostrando, recusa com 409 se outra pessoa já o alterou: ninguém sobrescreve sem ter visto.
 */
@Service
@Transactional
public class ItemService {

	private static final String ITEM_NAO_ENCONTRADO = "Item não encontrado.";

	private static final String ITEM_MUDOU = "Outra pessoa alterou este item agora há pouco. Os valores na tela "
			+ "foram atualizados; confira e tente de novo.";

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

	/**
	 * Nome, categoria e medida dos itens dessas listas, do alterado mais recentemente para o mais
	 * antigo (no máximo 1000): é o que a família já escolheu para cada produto. Uso interno das
	 * sugestões, que já verificaram o acesso à família.
	 */
	@Transactional(readOnly = true)
	public List<ItemClassificado> classificacoesRecentes(Collection<Long> listaIds) {
		if (listaIds.isEmpty()) {
			return List.of();
		}
		return itens.classificados(listaIds, PageRequest.of(0, 1000));
	}

	// ------------------------------------------------------------------ planejamento

	public ItemResponse adicionar(Long listaId, Long usuarioId, ItemRequest request) {
		Long familiaId = listaAcesso.travarParaAlterar(listaId, usuarioId, null);
		categoriaService.verificarDaFamilia(request.categoriaId(), familiaId);
		Item item = itens.save(new Item(listaId, request.categoriaId(), request.nome().trim(),
				request.quantidadePlanejada(), request.medida(), false, usuarioId));
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
			novos.add(new Item(listaId, request.categoriaId(), request.nome().trim(), request.quantidadePlanejada(),
					request.medida(), false, usuarioId));
		}
		itens.saveAll(novos);
	}

	public ItemResponse atualizar(Long itemId, Long usuarioId, AtualizarItemRequest request) {
		if (request.nome() != null && request.nome().isBlank()) {
			throw new ValidacaoException("nome", "Informe o nome do item.");
		}
		ItemTravado travado = travarItem(itemId, usuarioId, request.versao());
		Item item = travado.item();
		if (request.categoriaId() != null) {
			categoriaService.verificarDaFamilia(request.categoriaId(), travado.familiaId());
		}
		item.editarPlanejamento(request.nome() != null ? request.nome().trim() : item.getNome(),
				request.categoriaId() != null ? request.categoriaId() : item.getCategoriaId(),
				request.quantidadePlanejada() != null ? request.quantidadePlanejada() : item.getQuantidadePlanejada(),
				request.medida() != null ? request.medida() : item.getMedida());
		return gravado(item);
	}

	public void remover(Long itemId, Long usuarioId, @Nullable Long versao) {
		itens.delete(travarItem(itemId, usuarioId, versao).item());
	}

	// ------------------------------------------------------------------ compra em andamento

	/** Marca como pego com quantidade, preço e marca (todos opcionais), ou corrige esses valores. */
	public ItemResponse pegar(Long itemId, Long usuarioId, PegarRequest request) {
		Item item = travarItem(itemId, usuarioId, request.versao()).item();
		item.pegar(request.quantidadePega(), tipoOuPadrao(request.tipoPreco()), request.preco(),
				vazioParaNulo(request.marca()), usuarioId);
		return gravado(item);
	}

	/** Desmarca e apaga quantidade, preço e marca. */
	public ItemResponse desmarcar(Long itemId, Long usuarioId, @Nullable Long versao) {
		Item item = travarItem(itemId, usuarioId, versao).item();
		item.desmarcar();
		return gravado(item);
	}

	/** Item não planejado encontrado no mercado: entra na categoria escolhida já como pego. */
	public ItemResponse adicionarExtra(Long listaId, Long usuarioId, ExtraRequest request) {
		Long familiaId = listaAcesso.travarParaAlterar(listaId, usuarioId, null);
		categoriaService.verificarDaFamilia(request.categoriaId(), familiaId);
		Item item = new Item(listaId, request.categoriaId(), request.nome().trim(), null,
				tipoOuPadrao(request.tipoPreco()), true, usuarioId);
		item.pegar(request.quantidadePega(), tipoOuPadrao(request.tipoPreco()), request.preco(),
				vazioParaNulo(request.marca()), usuarioId);
		return paraResponse(itens.save(item));
	}

	/**
	 * Desmarca todos os itens da lista, apagando quantidades, preços e marcas. Com
	 * {@code versaoLista}, recusa (409) se alguém alterou a lista depois que a tela foi carregada.
	 */
	public void desmarcarTodos(Long listaId, Long usuarioId, @Nullable Long versaoLista) {
		listaAcesso.travarParaAlterar(listaId, usuarioId, versaoLista);
		itens.findByListaIdOrderByCriadoEmAscIdAsc(listaId).stream().filter(Item::isPego).forEach(Item::desmarcar);
	}

	/**
	 * Depois de finalizar a compra: a lista volta zerada. Itens não planejados ficam na lista só se
	 * estiverem em {@code extrasMantidos} (aí passam a ser planejados); os demais são removidos.
	 * Uso interno do módulo de compras, que já verificou o acesso e travou a lista.
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

	/**
	 * Trava a lista do item e só então lê o item: assim ele vem com os valores mais recentes, mesmo
	 * que outra pessoa tenha acabado de alterá-lo. Com {@code versaoEsperada} diferente da atual,
	 * responde 409.
	 */
	private ItemTravado travarItem(Long itemId, Long usuarioId, @Nullable Long versaoEsperada) {
		Long listaId = itens.findListaIdById(itemId)
			.orElseThrow(() -> new RecursoNaoEncontradoException(ITEM_NAO_ENCONTRADO));
		Long familiaId;
		try {
			familiaId = listaAcesso.travarParaAlterar(listaId, usuarioId, null);
		}
		catch (RecursoNaoEncontradoException e) {
			throw new RecursoNaoEncontradoException(ITEM_NAO_ENCONTRADO);
		}
		// Pode ter sido removido por outra pessoa enquanto esperávamos a trava
		Item item = itens.findById(itemId)
			.orElseThrow(() -> new RecursoNaoEncontradoException(ITEM_NAO_ENCONTRADO));
		if (versaoEsperada != null && versaoEsperada != item.getVersao()) {
			throw new ConflitoException(ITEM_MUDOU);
		}
		return new ItemTravado(item, familiaId);
	}

	private record ItemTravado(Item item, Long familiaId) {
	}

	/** Grava já (o Hibernate sobe a versão no UPDATE) para a resposta levar a versão nova. */
	private ItemResponse gravado(Item item) {
		itens.flush();
		return paraResponse(item);
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
					pessoa(usuarios, i.getAdicionadoPor()), i.getCriadoEm(), i.getAtualizadoEm(), i.getVersao()))
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
