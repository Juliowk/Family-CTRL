package br.com.familyctrl.compras;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import br.com.familyctrl.categorias.CategoriaService;
import br.com.familyctrl.categorias.dto.CategoriaResponse;
import br.com.familyctrl.familia.FamiliaCriada;
import br.com.familyctrl.itens.ItemService;
import br.com.familyctrl.itens.TipoPreco;
import br.com.familyctrl.itens.Valores;
import br.com.familyctrl.itens.dto.ItemRequest;
import br.com.familyctrl.itens.dto.ItemResponse;
import br.com.familyctrl.itens.dto.PegarRequest;
import br.com.familyctrl.listas.ListaService;
import br.com.familyctrl.listas.dto.ListaResponse;

/**
 * Cria, em toda família nova, a lista "Exemplo Visual": uma lista completa (todas as categorias,
 * alguns itens já pegos) com um histórico de 15 compras concluídas. Assim quem acabou de chegar vê
 * de cara o que o sistema oferece (compras concluídas, preços, marcas, mercados). As compras são
 * marcadas como exemplo: aparecem nas concluídas, mas não entram no resumo do mês (gasto,
 * quantidade e última compra), para não assustar com um gasto que não é da família.
 *
 * <p>Os dados variam de uma compra para outra (itens, quantidades, preços, mercados e datas), mas
 * são gerados com uma semente fixa por família: a mesma família sempre recebe o mesmo exemplo.
 * Roda na mesma transação da criação da família. Pode ser desligado com
 * {@code familyctrl.exemplo-visual.ativo=false} (os testes de integração desligam, para que cada
 * família de teste comece vazia).
 */
@Component
class ExemploVisual {

	static final String NOME_LISTA = "Exemplo Visual";

	static final int TOTAL_COMPRAS = 15;

	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	private static final String ACOUGUE = "Açougue, Embutidos e Peixaria";

	private static final String MERCEARIA = "Mercearia e Alimentos Básicos";

	private static final String LATICINIOS = "Laticínios, Frios e Ovos";

	private static final String PADARIA = "Padaria";

	private static final String HORTIFRUTI = "Hortifrúti e Congelados";

	private static final String LIMPEZA = "Limpeza";

	private static final String HIGIENE = "Higiene Pessoal";

	private static final String OUTROS = "Outros";

	/**
	 * Produto do exemplo. Por unidade: {@code quantidade} em unidades e {@code preco} da unidade.
	 * Por kg: {@code quantidade} é o peso típico e {@code preco} é o preço do quilo (o item guarda o
	 * total pago, calculado a partir dele).
	 */
	private record Produto(String nome, String categoria, String planejado, TipoPreco tipo, double quantidade,
			double preco) {
	}

	private static Produto un(String nome, String categoria, String planejado, int quantidade, double preco) {
		return new Produto(nome, categoria, planejado, TipoPreco.UNIDADE, quantidade, preco);
	}

	private static Produto kg(String nome, String categoria, String planejado, double peso, double precoKg) {
		return new Produto(nome, categoria, planejado, TipoPreco.KG, peso, precoKg);
	}

	/** Itens planejados da lista, na ordem de um mercado típico. */
	private static final List<Produto> PLANEJADOS = List.of(
			kg("Peito de frango", ACOUGUE, "1,5 kg", 1.5, 21.90),
			kg("Carne moída", ACOUGUE, "1 kg", 1.0, 38.90),
			kg("Linguiça toscana", ACOUGUE, null, 0.8, 24.90),
			kg("Alcatra em bifes", ACOUGUE, "1 kg", 1.0, 49.90),
			kg("Filé de tilápia", ACOUGUE, "500 g", 0.5, 54.90),
			un("Arroz 5 kg", MERCEARIA, "1 pacote", 1, 27.90),
			un("Feijão carioca 1 kg", MERCEARIA, "2 pacotes", 2, 8.49),
			un("Macarrão espaguete", MERCEARIA, "3 un", 3, 4.79),
			un("Óleo de soja", MERCEARIA, "2 un", 2, 7.99),
			un("Açúcar 1 kg", MERCEARIA, null, 1, 4.99),
			un("Café 500 g", MERCEARIA, "1 pacote", 1, 18.90),
			un("Farinha de trigo", MERCEARIA, null, 1, 5.49),
			un("Molho de tomate", MERCEARIA, "4 un", 4, 2.99),
			un("Biscoito de polvilho", MERCEARIA, "2 un", 2, 4.29),
			un("Achocolatado", MERCEARIA, null, 1, 9.90),
			un("Leite integral 1 L", LATICINIOS, "12 caixas", 12, 5.29),
			un("Ovos (dúzia)", LATICINIOS, "2 dúzias", 2, 13.90),
			kg("Queijo muçarela", LATICINIOS, "400 g", 0.4, 49.90),
			kg("Presunto", LATICINIOS, "300 g", 0.3, 39.90),
			un("Iogurte natural", LATICINIOS, "4 un", 4, 3.49),
			un("Manteiga", LATICINIOS, null, 1, 12.90),
			un("Requeijão", LATICINIOS, null, 1, 8.99),
			kg("Pão francês", PADARIA, "10 pães", 0.6, 16.90),
			un("Pão de forma", PADARIA, "1 pacote", 1, 9.49),
			un("Bolo de fubá", PADARIA, null, 1, 14.90),
			kg("Banana prata", HORTIFRUTI, "1 dúzia", 1.2, 6.99),
			kg("Tomate", HORTIFRUTI, "1 kg", 1.0, 8.49),
			kg("Cebola", HORTIFRUTI, "1 kg", 1.0, 5.99),
			kg("Batata", HORTIFRUTI, "1,5 kg", 1.5, 6.49),
			kg("Maçã", HORTIFRUTI, null, 1.0, 10.90),
			kg("Cenoura", HORTIFRUTI, null, 0.8, 5.49),
			un("Alface", HORTIFRUTI, "1 pé", 1, 3.49),
			un("Batata palito congelada", HORTIFRUTI, null, 1, 17.90),
			un("Detergente", LIMPEZA, "3 un", 3, 2.49),
			un("Sabão em pó", LIMPEZA, "1 caixa", 1, 21.90),
			un("Amaciante", LIMPEZA, null, 1, 15.90),
			un("Água sanitária", LIMPEZA, null, 1, 5.99),
			un("Esponja (pacote)", LIMPEZA, null, 1, 6.49),
			un("Saco de lixo", LIMPEZA, "1 rolo", 1, 12.90),
			un("Papel higiênico 12 rolos", HIGIENE, "1 pacote", 1, 22.90),
			un("Creme dental", HIGIENE, "2 un", 2, 4.99),
			un("Sabonete", HIGIENE, "4 un", 4, 2.29),
			un("Xampu", HIGIENE, null, 1, 16.90),
			un("Desodorante", HIGIENE, "2 un", 2, 11.90),
			un("Ração para gato", OUTROS, null, 1, 29.90),
			un("Pilhas AA", OUTROS, null, 1, 14.90));

	/** Itens não planejados que aparecem de vez em quando nas compras. */
	private static final List<Produto> EXTRAS = List.of(un("Chocolate", MERCEARIA, null, 2, 7.99),
			un("Refrigerante 2 L", MERCEARIA, null, 2, 9.49), un("Sorvete 1,5 L", HORTIFRUTI, null, 1, 24.90),
			un("Pizza congelada", HORTIFRUTI, null, 1, 19.90), kg("Picanha", ACOUGUE, null, 1.1, 79.90),
			un("Vinho tinto", OUTROS, null, 1, 39.90), un("Cerveja lata", OUTROS, null, 6, 3.99),
			un("Pão de queijo congelado", PADARIA, null, 1, 21.90));

	/** Itens já pegos na lista de exemplo, para mostrar uma compra em andamento. */
	private static final Set<String> PEGOS_NA_LISTA = Set.of("Pão francês", "Leite integral 1 L", "Ovos (dúzia)",
			"Banana prata", "Arroz 5 kg", "Detergente");

	private record Mercado(String nome, double fatorPreco, int peso) {
	}

	private static final List<Mercado> MERCADOS = List.of(new Mercado("Atacadão Bom Preço", 0.93, 4),
			new Mercado("Supermercado Central", 1.00, 4), new Mercado("Hiper Vale Verde", 0.98, 2),
			new Mercado("Mercado da Esquina", 1.08, 1));

	private static final List<String> MARCAS = List.of("Vale Verde", "Campo Bom", "Dona Clara", "Sabor Real",
			"Bem Bom", "Marca própria");

	private final boolean ativo;

	private final ListaService listaService;

	private final ItemService itemService;

	private final CategoriaService categoriaService;

	private final CompraRepository compras;

	ExemploVisual(@Value("${familyctrl.exemplo-visual.ativo:true}") boolean ativo, ListaService listaService,
			ItemService itemService, CategoriaService categoriaService, CompraRepository compras) {
		this.ativo = ativo;
		this.listaService = listaService;
		this.itemService = itemService;
		this.categoriaService = categoriaService;
		this.compras = compras;
	}

	@EventListener
	void aoCriarFamilia(FamiliaCriada evento) {
		if (ativo) {
			criar(evento.familiaId(), evento.usuarioId());
		}
	}

	/** Cria a lista de exemplo e o histórico de compras. Quem chama já garantiu que o usuário é membro. */
	void criar(Long familiaId, Long usuarioId) {
		Random sorte = new Random(familiaId);
		Map<String, CategoriaResponse> categorias = categoriaService.listarDaFamilia(familiaId)
			.stream()
			.collect(Collectors.toMap(CategoriaResponse::nome, Function.identity()));
		CategoriaResponse outros = categorias.values().stream().filter(CategoriaResponse::fixa).findFirst().orElseThrow();
		Function<String, CategoriaResponse> categoria = nome -> categorias.getOrDefault(nome, outros);

		List<ItemRequest> itens = PLANEJADOS.stream()
			.map(p -> new ItemRequest(p.nome(), categoria.apply(p.categoria()).id(), p.planejado(), p.tipo()))
			.toList();
		ListaResponse lista = listaService.importar(familiaId, usuarioId, NOME_LISTA, itens);

		LocalDate hoje = LocalDate.now(FUSO);
		LocalDate data = hoje.minusDays(1);
		List<Compra> historico = new ArrayList<>();
		for (int k = 0; k < TOTAL_COMPRAS; k++) {
			if (k > 0) {
				// Uma ida ao mercado a cada 7 a 11 dias, aproximadamente
				data = data.minusDays(7 + sorte.nextInt(5));
			}
			historico.add(compra(familiaId, usuarioId, lista.id(), data, k, sorte, categoria));
		}
		compras.saveAll(historico);

		marcarPegosNaLista(lista.id(), usuarioId, sorte);
	}

	private Compra compra(Long familiaId, Long usuarioId, Long listaId, LocalDate data, int k, Random sorte,
			Function<String, CategoriaResponse> categoria) {
		Mercado mercado = sortearMercado(sorte);
		// Compras mais antigas eram um pouco mais baratas (inflação de ~0,6% por compra)
		double fator = mercado.fatorPreco() * (1 - k * 0.006);
		List<CompraItem> itens = new ArrayList<>();
		BigDecimal variavel = BigDecimal.ZERO;

		for (Produto produto : PLANEJADOS) {
			// A lista muda um pouco com o tempo: nem todo item estava planejado em toda compra
			if (sorte.nextDouble() < 0.08) {
				continue;
			}
			CategoriaResponse cat = categoria.apply(produto.categoria());
			if (sorte.nextDouble() < 0.1) {
				// Não encontrado ou não precisou: fica registrado como não pego
				itens.add(new CompraItem(produto.nome(), cat.nome(), cat.ordem(), produto.planejado(), false, null,
						produto.tipo(), null, null, null, false));
				continue;
			}
			Pego pego = pegar(produto, fator, sorte);
			if (sorte.nextDouble() < 0.07) {
				// Sem preço anotado: o valor dele entra como "valor variável", descoberto no caixa
				variavel = variavel.add(pego.subtotal());
				itens.add(new CompraItem(produto.nome(), cat.nome(), cat.ordem(), produto.planejado(), true,
						pego.quantidade(), produto.tipo(), null, null, pego.marca(), false));
				continue;
			}
			itens.add(new CompraItem(produto.nome(), cat.nome(), cat.ordem(), produto.planejado(), true,
					pego.quantidade(), produto.tipo(), pego.preco(), pego.subtotal(), pego.marca(), false));
		}

		int extras = sorte.nextInt(4);
		List<Produto> sorteados = new ArrayList<>(EXTRAS);
		for (int i = 0; i < extras; i++) {
			Produto produto = sorteados.remove(sorte.nextInt(sorteados.size()));
			CategoriaResponse cat = categoria.apply(produto.categoria());
			Pego pego = pegar(produto, fator, sorte);
			itens.add(new CompraItem(produto.nome(), cat.nome(), cat.ordem(), null, true, pego.quantidade(),
					produto.tipo(), pego.preco(), pego.subtotal(), pego.marca(), true));
		}

		LocalTime hora = LocalTime.of(9 + sorte.nextInt(11), sorte.nextInt(60));
		return new Compra(familiaId, listaId, NOME_LISTA, mercado.nome(), data,
				variavel.setScale(2, RoundingMode.HALF_UP), usuarioId, data.atTime(hora).atZone(FUSO).toInstant(), true,
				itens);
	}

	/** Quantidade, preço e marca de um item pego, com pequenas variações em torno do típico. */
	private record Pego(BigDecimal quantidade, BigDecimal preco, BigDecimal subtotal, String marca) {
	}

	private static Pego pegar(Produto produto, double fator, Random sorte) {
		double variacao = fator * (0.92 + sorte.nextDouble() * 0.18);
		BigDecimal quantidade;
		BigDecimal preco;
		if (produto.tipo() == TipoPreco.KG) {
			double peso = produto.quantidade() * (0.75 + sorte.nextDouble() * 0.55);
			quantidade = BigDecimal.valueOf(peso).setScale(3, RoundingMode.HALF_UP);
			preco = dinheiro(produto.preco() * variacao * quantidade.doubleValue());
		}
		else {
			int base = (int) produto.quantidade();
			int unidades = base >= 2 ? Math.max(1, base + sorte.nextInt(3) - 1) : 1 + (sorte.nextDouble() < 0.15 ? 1 : 0);
			// Às vezes a quantidade não é anotada (conta como 1)
			quantidade = unidades == 1 && sorte.nextDouble() < 0.3 ? null : BigDecimal.valueOf(unidades);
			preco = dinheiro(produto.preco() * variacao);
		}
		String marca = produto.tipo() == TipoPreco.UNIDADE && sorte.nextDouble() < 0.5
				? MARCAS.get(sorte.nextInt(MARCAS.size())) : null;
		return new Pego(quantidade, preco, Valores.subtotal(produto.tipo(), preco, quantidade), marca);
	}

	private static Mercado sortearMercado(Random sorte) {
		int total = MERCADOS.stream().mapToInt(Mercado::peso).sum();
		int sorteio = sorte.nextInt(total);
		for (Mercado mercado : MERCADOS) {
			sorteio -= mercado.peso();
			if (sorteio < 0) {
				return mercado;
			}
		}
		return MERCADOS.getFirst();
	}

	/** Alguns itens da lista já pegos: mostra o total parcial e o destaque de "pego" na aba Comprar. */
	private void marcarPegosNaLista(Long listaId, Long usuarioId, Random sorte) {
		Map<String, Produto> porNome = PLANEJADOS.stream()
			.collect(Collectors.toMap(Produto::nome, Function.identity()));
		for (ItemResponse item : listaService.detalhar(listaId, usuarioId).itens()) {
			if (PEGOS_NA_LISTA.contains(item.nome())) {
				Produto produto = porNome.get(item.nome());
				Pego pego = pegar(produto, 1.0, sorte);
				itemService.pegar(item.id(), usuarioId,
						new PegarRequest(pego.quantidade(), produto.tipo(), pego.preco(), pego.marca(), null));
			}
		}
	}

	private static BigDecimal dinheiro(double valor) {
		return BigDecimal.valueOf(valor).setScale(2, RoundingMode.HALF_UP);
	}

}
