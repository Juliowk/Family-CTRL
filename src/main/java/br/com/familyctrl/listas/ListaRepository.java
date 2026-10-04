package br.com.familyctrl.listas;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

interface ListaRepository extends JpaRepository<Lista, Long> {

	List<Lista> findByFamiliaIdOrderByCriadaEmDesc(Long familiaId);

	/**
	 * Busca a lista travando a linha ({@code SELECT ... FOR UPDATE}) até o fim da transação: outra
	 * alteração na mesma lista espera esta terminar.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select l from Lista l where l.id = :id")
	Optional<Lista> travar(Long id);

}
