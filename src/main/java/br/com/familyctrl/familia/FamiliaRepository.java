package br.com.familyctrl.familia;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface FamiliaRepository extends JpaRepository<Familia, Long> {

	Optional<Familia> findByCodigoConvite(String codigoConvite);

	boolean existsByCodigoConvite(String codigoConvite);

}
