package com.springboot.MyTodoList.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Configuración SPA: devuelve index.html para cualquier ruta no reconocida,
 * permitiendo que React Router maneje la navegación del lado del cliente.
 */
@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location)
                            throws IOException {
                        Resource recurso = location.createRelative(resourcePath);
                        if (recurso.exists() && recurso.isReadable()) {
                            return recurso;
                        }
                        // Fallback: devolver index.html para rutas del cliente
                        return new ClassPathResource("/static/index.html");
                    }
                });
    }
}
