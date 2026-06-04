package com.springboot.MyTodoList.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@EnableWebSecurity
public class WebSecurityConfiguration {

    // ------------------------------------------------------------------
    // PROD: JWT validation via OCI OIDC. Spring auto-fetches signing keys
    // from the issuer-uri set in application-prod.properties.
    //
    // Scope authority names depend on how OCI formats the scope claim.
    // After Step 7, verify the token and adjust the hasAuthority() strings
    // to either SCOPE_read / SCOPE_admin
    // or SCOPE_mytodolist-api.read / SCOPE_mytodolist-api.admin.
    // ------------------------------------------------------------------
    @Configuration
    @Profile("prod")
    static class ProdSecurity {

        @Bean
        public SecurityFilterChain prodSecurityFilterChain(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                    .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/**")
                        .hasAnyAuthority("SCOPE_read", "SCOPE_mytodolist-api.read")
                    .requestMatchers("/api/**")
                        .hasAnyAuthority("SCOPE_admin", "SCOPE_mytodolist-api.admin")
                    .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));

            return http.build();
        }
    }

    // ------------------------------------------------------------------
    // LOCAL: no authentication — all requests pass through.
    // ------------------------------------------------------------------
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