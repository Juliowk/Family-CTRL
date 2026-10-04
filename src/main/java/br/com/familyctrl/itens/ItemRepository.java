package br.com.familyctrl.itens;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface ItemRepository extends JpaRepository<Item, Long> {

	/** Na ordem em que foram adicionados; o agrupamento por categoria é feito na tela. */
	List<Item> findByListaIdOrderByCriadoEmAscIdAsc(Long listaId);

	@Query("""
			select i.listaId as listaId,
			       count(i) as total,
			       coalesce(sum(case when i.pego = true then 1 else 0 end), 0) as pegos
			from Item i
			where i.listaId in :listaIds
			group by i.listaId""")
	List<ContagemLista> contarPorLista(Collection<Long> listaIds);

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
