package br.com.familyctrl.compras;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface CompraRepository extends JpaRepository<Compra, Long> {

	List<Compra> findByFamiliaIdOrderByDataCompraDescIdDesc(Long familiaId);

	// O resumo do mês ignora as compras de exemplo (ver Compra.exemplo)

	@Query("""
			select coalesce(sum(c.valorTotal), 0) from Compra c
			where c.familiaId = :familiaId and c.exemplo = false and c.dataCompra between :inicio and :fim""")
	BigDecimal somarEntre(Long familiaId, LocalDate inicio, LocalDate fim);

	long countByFamiliaIdAndExemploFalseAndDataCompraBetween(Long familiaId, LocalDate inicio, LocalDate fim);

	Optional<Compra> findFirstByFamiliaIdAndExemploFalseOrderByDataCompraDescIdDesc(Long familiaId);

	/** Total de itens e de itens pegos por compra, numa só consulta (evita carregar os itens). */
	@Query("""
			select i.compraId as compraId,
			       count(i) as total,
			       coalesce(sum(case when i.pego = true then 1 else 0 end), 0) as pegos
			from CompraItem i
			where i.compraId in :compraIds
			group by i.compraId""")
	List<ContagemCompra> contarItens(Collection<Long> compraIds);

	interface ContagemCompra {

		Long getCompraId();

		long getTotal();

		long getPegos();

	}

}
