package com.springboot.MyTodoList.security;

import com.springboot.MyTodoList.service.LocalJwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@EnableWebSecurity
public class WebSecurityConfiguration {

    @Configuration
    @Profile("prod")
    static class ProdSecurity {

        private final LocalJwtService localJwtService;

        ProdSecurity(LocalJwtService localJwtService) {
            this.localJwtService = localJwtService;
        }

        // Tries OCI JWKS decoder first; falls back to local HS256 decoder.
        // Both OCI-issued and locally-issued tokens can authenticate.
        @Bean
        public JwtDecoder jwtDecoder(
                @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri) {
            NimbusJwtDecoder ociDecoder   = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
            NimbusJwtDecoder localDecoder = localJwtService.getDecoder();
            return token -> {
                try {
                    return ociDecoder.decode(token);
                } catch (JwtException e) {
                    return localDecoder.decode(token);
                }
            };
        }

        @Bean
        public SecurityFilterChain prodSecurityFilterChain(HttpSecurity http, JwtDecoder jwtDecoder) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                    .requestMatchers("/api/auth/login", "/api/auth/users").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/**")
                        .hasAnyAuthority("SCOPE_mytodolist-apiread", "SCOPE_mytodolist-apiadmin")
                    .requestMatchers("/api/**")
                        .hasAuthority("SCOPE_mytodolist-apiadmin")
                    .anyRequest().permitAll()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.decoder(jwtDecoder)));

            return http.build();
        }
    }

    @Configuration
    @Profile("local")
    static class LocalSecurity {

        @Bean
        public SecurityFilterChain localSecurityFilterChain(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable);

            return http.build();
        }
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
