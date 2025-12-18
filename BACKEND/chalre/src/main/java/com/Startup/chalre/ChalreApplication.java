package com.Startup.chalre;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@EnableMethodSecurity
@SpringBootApplication
public class ChalreApplication {


	public static void main(String[] args) {
		SpringApplication.run(ChalreApplication.class, args);
	}

}
