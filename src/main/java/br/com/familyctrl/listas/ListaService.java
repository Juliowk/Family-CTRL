package br.com.familyctrl.listas;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.categorias.CategoriaService;
import br.com.familyctrl.familia.FamiliaService;
import br.com.familyctrl.infra.erro.RecursoNaoEncontradoException;
import br.com.familyctrl.itens.ItemService;
import br.com.familyctrl.itens.Progresso;
import br.com.familyctrl.listas.dto.ListaDetalhe;
import br.com.familyctrl.listas.dto.ListaResponse;

/**
 * Regras das listas. Qualquer membro da família pode criar, renomear e excluir listas.
 * Sem acesso à família, a resposta é 404.
 */
@Service
@Transactional
public class ListaService {

	private static final String NAO_ENCONTRADA = "Lista não encontrada.";

	private final ListaRepository listas;

	private final FamiliaService familiaService;

	private final ItemService itemService;

	private final CategoriaService categoriaService;

	ListaService(ListaRepository listas, FamiliaService familiaService, ItemService itemService,
			CategoriaService categoriaService) {
		this.listas = listas;
		this.familiaService = familiaService;
		this.itemService = itemService;
		this.categoriaService = categoriaService;
	}

	@Transactional(readOnly = true)
	public List<ListaResponse> listar(Long familiaId, Long usuarioId) {
		familiaService.verificarMembro(familiaId, usuarioId);
		List<Lista> daFamilia = listas.findByFamiliaIdOrderByCriadaEmDesc(familiaId);
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

	/** Lista com categorias e itens. Não é readOnly: o 1º acesso cria as categorias padrão. */
	public ListaDetalhe detalhar(Long listaId, Long usuarioId) {
		Lista lista = buscar(listaId, usuarioId);
		return new ListaDetalhe(lista.getId(), lista.getFamiliaId(), lista.getNome(), lista.getCriadaEm(),
				categoriaService.listarDaFamilia(lista.getFamiliaId()), itemService.listarDaLista(listaId));
	}

	public ListaResponse renomear(Long listaId, Long usuarioId, String nome) {
		Lista lista = buscar(listaId, usuarioId);
		lista.setNome(nome.trim());
		Progresso progresso = itemService.progressoPorLista(List.of(listaId))
			.getOrDefault(listaId, Progresso.VAZIO);
		return paraResponse(lista, progresso);
	}

	/**
	 * Exclui a lista; os itens são removidos junto (ON DELETE CASCADE). As compras concluídas
	 * continuam no histórico (guardam o nome da lista).
	 */
	public void excluir(Long listaId, Long usuarioId) {
		listas.delete(buscar(listaId, usuarioId));
	}

	private Lista buscar(Long listaId, Long usuarioId) {
		return listas.findById(listaId)
			.filter(lista -> familiaService.ehMembro(lista.getFamiliaId(), usuarioId))
			.orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));
	}

	private static ListaResponse paraResponse(Lista lista, Progresso progresso) {
		return new ListaResponse(lista.getId(), lista.getFamiliaId(), lista.getNome(), lista.getCriadaEm(),
				progresso.total(), progresso.pegos());
	}

}
