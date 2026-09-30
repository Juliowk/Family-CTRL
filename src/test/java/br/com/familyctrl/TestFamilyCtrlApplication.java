package br.com.familyctrl;

import org.springframework.boot.SpringApplication;

public class TestFamilyCtrlApplication {

	public static void main(String[] args) {
		SpringApplication.from(FamilyCtrlApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
