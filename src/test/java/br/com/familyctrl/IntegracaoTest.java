package br.com.familyctrl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Base para testes de integração: sobe a aplicação inteira com um PostgreSQL real (Testcontainers)
 * e disponibiliza o {@link MockMvc} para chamar a API. Todas as subclasses compartilham o mesmo
 * contexto do Spring (e o mesmo contêiner), o que deixa a suíte bem mais rápida.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
public abstract class IntegracaoTest {

	@Autowired
	protected MockMvc mvc;

}
