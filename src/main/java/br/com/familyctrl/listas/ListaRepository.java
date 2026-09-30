package br.com.familyctrl.listas;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface ListaRepository extends JpaRepository<Lista, Long> {

	List<Lista> findByFamiliaIdAndArquivadaOrderByCriadaEmDesc(Long familiaId, boolean arquivada);

}
