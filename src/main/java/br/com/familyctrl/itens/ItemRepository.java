package br.com.familyctrl.itens;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface ItemRepository extends JpaRepository<Item, Long> {

	/** Pendentes primeiro (false < true), depois na ordem em que foram adicionados. */
	List<Item> findByListaIdOrderByCompradoAscCriadoEmAscIdAsc(Long listaId);

	@Query("""
			select i.listaId as listaId,
			       count(i) as total,
			       coalesce(sum(case when i.comprado = true then 1 else 0 end), 0) as comprados
			from Item i
			where i.listaId in :listaIds
			group by i.listaId""")
	List<ProgressoLista> contarPorLista(Collection<Long> listaIds);

	@Modifying
	@Query("delete from Item i where i.listaId = :listaId and i.comprado = true")
	int excluirComprados(Long listaId);

	interface ProgressoLista {

		Long getListaId();

		long getTotal();

		long getComprados();

	}

}
