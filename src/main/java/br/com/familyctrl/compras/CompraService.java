package br.com.familyctrl.compras;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.auth.UsuarioService;
import br.com.familyctrl.auth.dto.UsuarioResponse;
import br.com.familyctrl.categorias.dto.CategoriaResponse;
import br.com.familyctrl.compras.dto.CompraDetalhe;
import br.com.familyctrl.compras.dto.CompraItemResponse;
import br.com.familyctrl.compras.dto.CompraResumo;
import br.com.familyctrl.compras.dto.FinalizarRequest;
import br.com.familyctrl.compras.dto.ResumoMes;
import br.com.familyctrl.familia.FamiliaService;
import br.com.familyctrl.infra.erro.RecursoNaoEncontradoException;
import br.com.familyctrl.infra.erro.ValidacaoException;
import br.com.familyctrl.itens.ItemService;
import br.com.familyctrl.itens.dto.ItemResponse;
import br.com.familyctrl.listas.ListaService;
import br.com.familyctrl.listas.dto.ListaDetalhe;

/**
 * Regras das compras. Finalizar transforma a compra em andamento de uma lista numa compra
 * concluída e zera a lista para a próxima vez. Sem acesso à família, a resposta é 404.
 */
@Service
@Transactional
public class CompraService {

	private static final String NAO_ENCONTRADA = "Compra não encontrada.";

	private final CompraRepository compras;

	private final ListaService listaService;

	private final ItemService itemService;

	private final FamiliaService familiaService;

	private final UsuarioService usuarioService;

	CompraService(CompraRepository compras, ListaService listaService, ItemService itemService,
			FamiliaService familiaService, UsuarioService usuarioService) {
		this.compras = compras;
		this.listaService = listaService;
		this.itemService = itemService;
		this.familiaService = familiaService;
		this.usuarioService = usuarioService;
	}

	/**
	 * Finaliza a compra numa única transação: salva a cópia dos itens com os valores, zera a lista
	 * e decide o destino dos itens não planejados. O valor dos itens é recalculado aqui a partir
	 * dos preços salvos: o total enviado pela tela nunca é usado.
	 */
	public CompraDetalhe finalizar(Long listaId, Long usuarioId, FinalizarRequest request) {
		ListaDetalhe lista = listaService.detalhar(listaId, usuarioId);
		if (lista.itens().stream().noneMatch(ItemResponse::pego)) {
			throw new ValidacaoException("itens", "Marque ao menos um item antes de finalizar a compra.");
		}
		Map<Long, CategoriaResponse> categorias = lista.categorias()
			.stream()
			.collect(Collectors.toMap(CategoriaResponse::id, Function.identity()));
		List<CompraItem> itens = lista.itens().stream().map(item -> copiar(item, categorias)).toList();

		Compra compra = compras.save(new Compra(lista.familiaId(), lista.id(), lista.nome(), request.mercado().trim(),
				request.dataCompra(), request.valorVariavel(), usuarioId, itens));

		Set<Long> manter = request.extrasMantidos() != null ? new HashSet<>(request.extrasMantidos()) : Set.of();
		itemService.zerarAposCompra(listaId, manter);
		return detalhe(compra);
	}

	@Transactional(readOnly = true)
	public List<CompraResumo> listar(Long familiaId, Long usuarioId) {
		familiaService.verificarMembro(familiaId, usuarioId);
		return resumos(compras.findByFamiliaIdOrderByDataCompraDescIdDesc(familiaId));
	}

	@Transactional(readOnly = true)
	public CompraDetalhe detalhar(Long compraId, Long usuarioId) {
		Compra compra = compras.findById(compraId)
			.filter(c -> familiaService.ehMembro(c.getFamiliaId(), usuarioId))
			.orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));
		return detalhe(compra);
	}

	/**
	 * Gasto e número de compras no mês informado (AAAA-MM). O mês vem da tela porque o servidor
	 * roda em UTC e o "mês atual" é o do usuário.
	 */
	@Transactional(readOnly = true)
	public ResumoMes resumo(Long familiaId, Long usuarioId, String mes) {
		familiaService.verificarMembro(familiaId, usuarioId);
		YearMonth anoMes;
		try {
			anoMes = YearMonth.parse(mes);
		}
		catch (DateTimeParseException | NullPointerException e) {
			throw new ValidacaoException("mes", "Informe o mês no formato AAAA-MM.");
		}
		var inicio = anoMes.atDay(1);
		var fim = anoMes.atEndOfMonth();
		CompraResumo ultima = compras.findByFamiliaIdOrderByDataCompraDescIdDesc(familiaId)
			.stream()
			.findFirst()
			.map(c -> resumos(List.of(c)).getFirst())
			.orElse(null);
		return new ResumoMes(anoMes.toString(), compras.somarEntre(familiaId, inicio, fim),
				compras.countByFamiliaIdAndDataCompraBetween(familiaId, inicio, fim), ultima);
	}

	// ---------------------------------------------------------------------------------------------

	private static CompraItem copiar(ItemResponse item, Map<Long, CategoriaResponse> categorias) {
		CategoriaResponse categoria = categorias.get(item.categoriaId());
		return new CompraItem(item.nome(), categoria != null ? categoria.nome() : "Outros",
				categoria != null ? categoria.ordem() : Integer.MAX_VALUE, item.quantidadePlanejada(), item.pego(),
				item.pego() ? item.quantidadePega() : null, item.tipoPreco(), item.pego() ? item.preco() : null,
				item.subtotal(), item.pego() ? item.marca() : null, item.extra());
	}

	private List<CompraResumo> resumos(List<Compra> lista) {
		if (lista.isEmpty()) {
			return List.of();
		}
		Map<Long, CompraRepository.ContagemCompra> contagens = compras
			.contarItens(lista.stream().map(Compra::getId).toList())
			.stream()
			.collect(Collectors.toMap(CompraRepository.ContagemCompra::getCompraId, Function.identity()));
		return lista.stream().map(c -> {
			var contagem = contagens.get(c.getId());
			return new CompraResumo(c.getId(), c.getListaId(), c.getListaNome(), c.getMercado(), c.getDataCompra(),
					c.getValorItens(), c.getValorVariavel(), c.getValorTotal(), contagem != null ? contagem.getTotal() : 0,
					contagem != null ? contagem.getPegos() : 0);
		}).toList();
	}

	private CompraDetalhe detalhe(Compra compra) {
		List<CompraItemResponse> itens = compra.getItens()
			.stream()
			.map(i -> new CompraItemResponse(i.getId(), i.getNome(), i.getCategoria(), i.getCategoriaOrdem(),
					i.getQuantidadePlanejada(), i.isPego(), i.getQuantidadePega(), i.getTipoPreco(), i.getPreco(),
					i.getSubtotal(), i.getMarca(), i.isExtra()))
			.toList();
		UsuarioResponse quem = usuarioService.buscarPorIds(List.of(compra.getFinalizadaPor()))
			.get(compra.getFinalizadaPor());
		long pegos = itens.stream().filter(CompraItemResponse::pego).count();
		return new CompraDetalhe(compra.getId(), compra.getFamiliaId(), compra.getListaId(), compra.getListaNome(),
				compra.getMercado(), compra.getDataCompra(), compra.getValorItens(), compra.getValorVariavel(),
				compra.getValorTotal(), itens.size(), pegos, quem != null ? quem.nome() : null,
				compra.getFinalizadaEm(), itens);
	}

}
