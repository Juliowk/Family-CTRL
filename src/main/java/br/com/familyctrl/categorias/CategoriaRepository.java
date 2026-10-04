package br.com.familyctrl.categorias;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface CategoriaRepository extends JpaRepository<Categoria, Long> {

	List<Categoria> findByFamiliaIdOrderByOrdemAscIdAsc(Long familiaId);

	Optional<Categoria> findByFamiliaIdAndFixaTrue(Long familiaId);

	boolean existsByFamiliaIdAndNomeIgnoreCase(Long familiaId, String nome);

}
