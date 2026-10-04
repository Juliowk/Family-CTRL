package br.com.familyctrl.categorias;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.categorias.dto.CategoriaResponse;
import br.com.familyctrl.familia.FamiliaService;
import br.com.familyctrl.infra.erro.ConflitoException;
import br.com.familyctrl.infra.erro.RecursoNaoEncontradoException;
import br.com.familyctrl.infra.erro.ValidacaoException;

/**
 * Regras das categorias. Qualquer membro da família gerencia as categorias. Cada família tem
 * sempre a categoria fixa "Outros", que recebe os itens de categorias excluídas.
 */
@Service
@Transactional
public class CategoriaService {

	private static final String NAO_ENCONTRADA = "Categoria não encontrada.";

	/** Categorias com que toda família começa, na ordem de um mercado típico. */
	private static final List<String> PADRAO = List.of("Açougue, Embutidos e Peixaria",
			"Mercearia e Alimentos Básicos", "Laticínios, Frios e Ovos", "Padaria", "Hortifrúti e Congelados",
			"Limpeza", "Higiene Pessoal");

	private static final String OUTROS = "Outros";

	private final CategoriaRepository categorias;

	private final FamiliaService familiaService;

	private final ApplicationEventPublisher eventos;

	CategoriaService(CategoriaRepository categorias, FamiliaService familiaService,
			ApplicationEventPublisher eventos) {
		this.categorias = categorias;
		this.familiaService = familiaService;
		this.eventos = eventos;
	}

	public List<CategoriaResponse> listar(Long familiaId, Long usuarioId) {
		familiaService.verificarMembro(familiaId, usuarioId);
		return listarDaFamilia(familiaId);
	}

	/**
	 * Categorias da família, criando as padrão no primeiro acesso (famílias novas). Uso interno de
	 * outros módulos, que já verificaram o acesso à família.
	 */
	public List<CategoriaResponse> listarDaFamilia(Long familiaId) {
		return garantirPadrao(familiaId).stream().map(CategoriaService::paraResponse).toList();
	}

	/** Mapa id → categoria da família (para quem precisa do nome a partir do id). */
	public Map<Long, CategoriaResponse> mapaDaFamilia(Long familiaId) {
		return listarDaFamilia(familiaId).stream()
			.collect(Collectors.toMap(CategoriaResponse::id, Function.identity()));
	}

	/** Garante que a categoria existe e é desta família; senão erro de validação no campo. */
	@Transactional(readOnly = true)
	public void verificarDaFamilia(Long categoriaId, Long familiaId) {
		boolean valida = categoriaId != null
				&& categorias.findById(categoriaId).map(c -> c.getFamiliaId().equals(familiaId)).orElse(false);
		if (!valida) {
			throw new ValidacaoException("categoriaId", "Escolha uma categoria válida.");
		}
	}

	public CategoriaResponse criar(Long familiaId, Long usuarioId, String nome) {
		familiaService.verificarMembro(familiaId, usuarioId);
		List<Categoria> atuais = garantirPadrao(familiaId);
		String limpo = nome.trim();
		verificarNomeLivre(familiaId, limpo);
		// A nova categoria entra antes de "Outros", que fica sempre por último
		Categoria outros = atuais.stream().filter(Categoria::isFixa).findFirst().orElseThrow();
		Categoria nova = categorias.save(new Categoria(familiaId, limpo, outros.getOrdem(), false));
		outros.setOrdem(outros.getOrdem() + 1);
		return paraResponse(nova);
	}

	public CategoriaResponse renomear(Long categoriaId, Long usuarioId, String nome) {
		Categoria categoria = buscar(categoriaId, usuarioId);
		if (categoria.isFixa()) {
			throw new ConflitoException("A categoria \"Outros\" não pode ser renomeada.");
		}
		String limpo = nome.trim();
		if (!categoria.getNome().equalsIgnoreCase(limpo)) {
			verificarNomeLivre(categoria.getFamiliaId(), limpo);
		}
		categoria.setNome(limpo);
		return paraResponse(categoria);
	}

	/** Exclui a categoria; os itens dela vão para "Outros" (via evento {@link CategoriaExcluida}). */
	public void excluir(Long categoriaId, Long usuarioId) {
		Categoria categoria = buscar(categoriaId, usuarioId);
		if (categoria.isFixa()) {
			throw new ConflitoException("A categoria \"Outros\" não pode ser excluída.");
		}
		Categoria outros = categorias.findByFamiliaIdAndFixaTrue(categoria.getFamiliaId()).orElseThrow();
		eventos.publishEvent(new CategoriaExcluida(categoria.getId(), outros.getId()));
		categorias.delete(categoria);
	}

	/** Reordena: recebe todos os ids da família na nova ordem. "Outros" continua por último. */
	public List<CategoriaResponse> reordenar(Long familiaId, Long usuarioId, List<Long> ids) {
		familiaService.verificarMembro(familiaId, usuarioId);
		List<Categoria> atuais = garantirPadrao(familiaId);
		Map<Long, Categoria> porId = atuais.stream()
			.collect(Collectors.toMap(Categoria::getId, Function.identity()));
		if (ids.size() != atuais.size() || !new HashSet<>(ids).equals(porId.keySet())) {
			throw new ValidacaoException("ids", "Envie todas as categorias da família, sem repetir.");
		}
		List<Categoria> ordenadas = new ArrayList<>(
				ids.stream().map(porId::get).filter(c -> !c.isFixa()).toList());
		ordenadas.add(atuais.stream().filter(Categoria::isFixa).findFirst().orElseThrow());
		for (int i = 0; i < ordenadas.size(); i++) {
			ordenadas.get(i).setOrdem(i + 1);
		}
		return ordenadas.stream().map(CategoriaService::paraResponse).toList();
	}

	// ---------------------------------------------------------------------------------------------

	private List<Categoria> garantirPadrao(Long familiaId) {
		List<Categoria> atuais = categorias.findByFamiliaIdOrderByOrdemAscIdAsc(familiaId);
		if (!atuais.isEmpty()) {
			return atuais;
		}
		List<Categoria> novas = new ArrayList<>();
		for (int i = 0; i < PADRAO.size(); i++) {
			novas.add(new Categoria(familiaId, PADRAO.get(i), i + 1, false));
		}
		novas.add(new Categoria(familiaId, OUTROS, PADRAO.size() + 1, true));
		return categorias.saveAll(novas);
	}

	private void verificarNomeLivre(Long familiaId, String nome) {
		if (categorias.existsByFamiliaIdAndNomeIgnoreCase(familiaId, nome)) {
			throw new ConflitoException("Já existe uma categoria com esse nome.");
		}
	}

	private Categoria buscar(Long categoriaId, Long usuarioId) {
		return categorias.findById(categoriaId)
			.filter(c -> familiaService.ehMembro(c.getFamiliaId(), usuarioId))
			.orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));
	}

	private static CategoriaResponse paraResponse(Categoria categoria) {
		return new CategoriaResponse(categoria.getId(), categoria.getNome(), categoria.getOrdem(),
				categoria.isFixa());
	}

}
