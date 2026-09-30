package br.com.familyctrl;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class FamilyCtrlApplication {

	public static void main(String[] args) {
		SpringApplication.run(FamilyCtrlApplication.class, args);
	}

}
