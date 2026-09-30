package br.com.familyctrl.familia;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface MembroFamiliaRepository extends JpaRepository<MembroFamilia, MembroFamiliaId> {

	List<MembroFamilia> findByIdUsuarioId(Long usuarioId);

	List<MembroFamilia> findByIdFamiliaId(Long familiaId);

	long countByIdFamiliaId(Long familiaId);

	long countByIdFamiliaIdAndPapel(Long familiaId, Papel papel);

	/** Total de membros de cada família informada, numa só consulta. */
	@Query("""
			select m.id.familiaId as familiaId, count(m) as total
			from MembroFamilia m
			where m.id.familiaId in :familiaIds
			group by m.id.familiaId""")
	List<TotalMembros> contarPorFamilia(Collection<Long> familiaIds);

	interface TotalMembros {

		Long getFamiliaId();

		long getTotal();

	}

}
