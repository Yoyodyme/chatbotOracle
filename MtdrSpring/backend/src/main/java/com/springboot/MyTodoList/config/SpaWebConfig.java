package com.springboot.MyTodoList.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * SPA configuration: returns index.html for any unrecognized route,
 * allowing React Router to handle client-side navigation.
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
                        // Fallback: return index.html for client-side routes
                        return new ClassPathResource("/static/index.html");
                    }
                });
    }
}
