package br.com.familyctrl.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface UsuarioRepository extends JpaRepository<Usuario, Long> {

	Optional<Usuario> findByEmail(String email);

	boolean existsByEmail(String email);

}
