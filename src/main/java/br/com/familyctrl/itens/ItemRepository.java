package br.com.familyctrl.itens;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface ItemRepository extends JpaRepository<Item, Long> {

	/** Na ordem em que foram adicionados; o agrupamento por categoria é feito na tela. */
	List<Item> findByListaIdOrderByCriadoEmAscIdAsc(Long listaId);

	/** Só a lista do item, sem carregar a entidade (ela é lida depois de travar a lista). */
	@Query("select i.listaId from Item i where i.id = :id")
	Optional<Long> findListaIdById(Long id);

	@Query("""
			select i.listaId as listaId,
			       count(i) as total,
			       coalesce(sum(case when i.pego = true then 1 else 0 end), 0) as pegos
			from Item i
			where i.listaId in :listaIds
			group by i.listaId""")
	List<ContagemLista> contarPorLista(Collection<Long> listaIds);

	/** Nome, categoria e medida dos itens das listas, do alterado mais recentemente para o mais antigo. */
	@Query("""
			select new br.com.familyctrl.itens.ItemClassificado(i.nome, i.categoriaId, i.medida)
			from Item i
			where i.listaId in :listaIds
			order by i.atualizadoEm desc""")
	List<ItemClassificado> classificados(Collection<Long> listaIds, Pageable pagina);

	/** Usado quando uma categoria é excluída: os itens vão para "Outros". */
	@Modifying
	@Query("update Item i set i.categoriaId = :destino where i.categoriaId = :origem")
	int moverCategoria(Long origem, Long destino);

	interface ContagemLista {

		Long getListaId();

		long getTotal();

		long getPegos();

	}

}
