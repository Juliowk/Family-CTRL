package br.com.familyctrl.compras;

import java.math.BigDecimal;
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
import br.com.familyctrl.itens.TipoPreco;
import br.com.familyctrl.itens.dto.ItemResponse;
import br.com.familyctrl.listas.ListaAcesso;
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

	private final ListaAcesso listaAcesso;

	private final ItemService itemService;

	private final FamiliaService familiaService;

	private final UsuarioService usuarioService;

	CompraService(CompraRepository compras, ListaService listaService, ListaAcesso listaAcesso,
			ItemService itemService, FamiliaService familiaService, UsuarioService usuarioService) {
		this.compras = compras;
		this.listaService = listaService;
		this.listaAcesso = listaAcesso;
		this.itemService = itemService;
		this.familiaService = familiaService;
		this.usuarioService = usuarioService;
	}

	/**
	 * Finaliza a compra numa única transação: salva a cópia dos itens com os valores, zera a lista
	 * e decide o destino dos itens não planejados. O valor dos itens é recalculado aqui a partir
	 * dos preços salvos; o valor pago (do cupom) é o informado pela pessoa, e a diferença entre os
	 * dois fica registrada (negativa: desconto).
	 *
	 * <p>A lista fica travada durante a finalização: ninguém marca ou altera itens no meio dela. E,
	 * com a versão informada pela tela, só finaliza se a lista ainda for exatamente a que a pessoa
	 * conferiu (senão, 409): o total salvo é sempre o total que ela viu.
	 */
	public CompraDetalhe finalizar(Long listaId, Long usuarioId, FinalizarRequest request) {
		listaAcesso.travarParaAlterar(listaId, usuarioId, request.versaoLista());
		ListaDetalhe lista = listaService.detalhar(listaId, usuarioId);
		if (lista.itens().stream().noneMatch(ItemResponse::pego)) {
			throw new ValidacaoException("itens", "Marque ao menos um item antes de finalizar a compra.");
		}
		Map<Long, CategoriaResponse> categorias = lista.categorias()
			.stream()
			.collect(Collectors.toMap(CategoriaResponse::id, Function.identity()));
		List<CompraItem> itens = lista.itens().stream().map(item -> copiar(item, categorias)).toList();

		String mercado = request.mercado() == null || request.mercado().isBlank() ? null : request.mercado().trim();
		Compra compra = compras.save(Compra.finalizada(lista.familiaId(), lista.id(), lista.nome(), mercado,
				request.dataCompra(), request.valorTotal(), usuarioId, itens));

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
	 * roda em UTC e o "mês atual" é o do usuário. As compras de exemplo ficam de fora (inclusive da
	 * "última compra"), para não assustar quem acabou de chegar com um gasto que não é dele.
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
		CompraResumo ultima = compras.findFirstByFamiliaIdAndExemploFalseOrderByDataCompraDescIdDesc(familiaId)
			.map(c -> resumos(List.of(c)).getFirst())
			.orElse(null);
		return new ResumoMes(anoMes.toString(), compras.somarEntre(familiaId, inicio, fim),
				compras.countByFamiliaIdAndExemploFalseAndDataCompraBetween(familiaId, inicio, fim), ultima);
	}

	// ---------------------------------------------------------------------------------------------

	private static CompraItem copiar(ItemResponse item, Map<Long, CategoriaResponse> categorias) {
		CategoriaResponse categoria = categorias.get(item.categoriaId());
		return new CompraItem(item.nome(), categoria != null ? categoria.nome() : "Outros",
				categoria != null ? categoria.ordem() : Integer.MAX_VALUE,
				textoDaQuantidade(item.quantidadePlanejada(), item.medida()), item.pego(),
				item.pego() ? item.quantidadePega() : null, item.tipoPreco(), item.pego() ? item.preco() : null,
				item.subtotal(), item.pego() ? item.marca() : null, item.extra());
	}

	/**
	 * Quantidade planejada como texto para o histórico, que guarda como estava no dia:
	 * "2 un", "300 g" ou "1,5 kg".
	 */
	static String textoDaQuantidade(BigDecimal quantidade, TipoPreco medida) {
		if (quantidade == null) {
			return null;
		}
		if (medida == TipoPreco.KG && quantidade.compareTo(BigDecimal.ONE) < 0) {
			return numero(quantidade.movePointRight(3)) + " g";
		}
		return numero(quantidade) + (medida == TipoPreco.KG ? " kg" : " un");
	}

	private static String numero(BigDecimal valor) {
		return valor.stripTrailingZeros().toPlainString().replace('.', ',');
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
					contagem != null ? contagem.getPegos() : 0, c.isExemplo());
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
				compra.getValorTotal(), itens.size(), pegos, compra.isExemplo(), quem != null ? quem.nome() : null,
				compra.getFinalizadaEm(), itens);
	}

}
