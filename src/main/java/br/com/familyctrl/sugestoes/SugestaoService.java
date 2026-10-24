package br.com.familyctrl.sugestoes;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import br.com.familyctrl.categorias.CategoriaService;
import br.com.familyctrl.categorias.dto.CategoriaResponse;
import br.com.familyctrl.familia.FamiliaService;
import br.com.familyctrl.infra.erro.ValidacaoException;
import br.com.familyctrl.itens.ItemService;
import br.com.familyctrl.itens.TipoPreco;
import br.com.familyctrl.listas.ListaService;
import br.com.familyctrl.sugestoes.dto.SugestaoItem;
import br.com.familyctrl.sugestoes.dto.SugestaoItem.Origem;

/**
 * Sugere categoria e medida a partir do nome de um produto, para quem digita só o nome. Tenta, em
 * ordem, do mais barato para o mais caro:
 * <ol>
 * <li>o histórico da família (o que ela já escolheu para esse produto);</li>
 * <li>o dicionário embutido de produtos comuns;</li>
 * <li>uma resposta da IA já guardada para a família;</li>
 * <li>a IA (Gemini), se houver chave e o usuário estiver dentro do limite por hora.</li>
 * </ol>
 * Sem nada disso, "Outros", por unidade. Sem acesso à família, 404.
 *
 * <p>Não é {@code @Transactional} de propósito: a chamada à IA pode levar alguns segundos e não deve
 * segurar uma conexão do banco (o pool tem só 5). Cada consulta ao banco tem a sua transação curta.
 */
@Service
public class SugestaoService {

	private final FamiliaService familiaService;

	private final CategoriaService categoriaService;

	private final ListaService listaService;

	private final ItemService itemService;

	private final DicionarioProdutos dicionario;

	private final SugestaoSalvaRepository salvas;

	private final ClienteGemini gemini;

	private final LimiteDeConsultas limite;

	private final GeminiProperties propriedades;

	SugestaoService(FamiliaService familiaService, CategoriaService categoriaService, ListaService listaService,
			ItemService itemService, DicionarioProdutos dicionario, SugestaoSalvaRepository salvas, ClienteGemini gemini,
			LimiteDeConsultas limite, GeminiProperties propriedades) {
		this.familiaService = familiaService;
		this.categoriaService = categoriaService;
		this.listaService = listaService;
		this.itemService = itemService;
		this.dicionario = dicionario;
		this.salvas = salvas;
		this.gemini = gemini;
		this.limite = limite;
		this.propriedades = propriedades;
	}

	public SugestaoItem sugerir(Long familiaId, Long usuarioId, String nome) {
		familiaService.verificarMembro(familiaId, usuarioId);
		String produto = nome == null ? "" : nome.trim();
		String normalizado = NomeProduto.normalizar(produto);
		if (normalizado.isEmpty() || produto.length() > 120) {
			throw new ValidacaoException("nome", "Informe o nome do item (até 120 caracteres).");
		}
		List<CategoriaResponse> categorias = categoriaService.listarDaFamilia(familiaId);
		CategoriaResponse outros = categorias.stream().filter(CategoriaResponse::fixa).findFirst().orElseThrow();

		Optional<SugestaoItem> sugestao = doHistorico(familiaId, normalizado, outros)
			.or(() -> doDicionario(normalizado, categorias))
			.or(() -> salvas.findByFamiliaIdAndNomeNormalizado(familiaId, normalizado)
				.map(s -> new SugestaoItem(s.getCategoriaId(), s.getMedida(), Origem.IA)))
			.or(() -> daIa(familiaId, usuarioId, produto, normalizado, categorias));
		return sugestao.orElse(new SugestaoItem(outros.id(), TipoPreco.UNIDADE, Origem.PADRAO));
	}

	/** A escolha mais recente da família para o mesmo produto. "Outros" não conta: pode ser só o padrão. */
	private Optional<SugestaoItem> doHistorico(Long familiaId, String normalizado, CategoriaResponse outros) {
		return itemService.classificacoesRecentes(listaService.idsDaFamilia(familiaId))
			.stream()
			.filter(item -> !item.categoriaId().equals(outros.id()))
			.filter(item -> NomeProduto.normalizar(item.nome()).equals(normalizado))
			.findFirst()
			.map(item -> new SugestaoItem(item.categoriaId(), item.medida(), Origem.HISTORICO));
	}

	/** Produto do dicionário, na categoria da família que corresponde à padrão (mesmo renomeada). */
	private Optional<SugestaoItem> doDicionario(String normalizado, List<CategoriaResponse> categorias) {
		return dicionario.buscar(normalizado)
			.flatMap(produto -> categorias.stream()
				.filter(c -> NomeProduto.normalizar(c.nome()).contains(produto.categoria().palavraChave))
				.findFirst()
				.map(c -> new SugestaoItem(c.id(), produto.medida(), Origem.DICIONARIO)));
	}

	private Optional<SugestaoItem> daIa(Long familiaId, Long usuarioId, String produto, String normalizado,
			List<CategoriaResponse> categorias) {
		if (!gemini.ativo() || !limite.permitir(usuarioId, propriedades.limitePorHora())) {
			return Optional.empty();
		}
		List<String> nomes = categorias.stream().map(CategoriaResponse::nome).toList();
		return gemini.classificar(produto, nomes).flatMap(resposta -> categorias.stream()
			.filter(c -> c.nome().equals(resposta.categoria()))
			.findFirst()
			.map(c -> {
				salvas.guardar(familiaId, normalizado, c.id(), resposta.medida().name());
				return new SugestaoItem(c.id(), resposta.medida(), Origem.IA);
			}));
	}

}
