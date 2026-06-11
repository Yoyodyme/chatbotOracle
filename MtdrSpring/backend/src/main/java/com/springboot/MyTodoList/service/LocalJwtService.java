package com.springboot.MyTodoList.service;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.springboot.MyTodoList.model.Usuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class LocalJwtService {

    private static final long EXPIRY_MS = 8L * 3600 * 1000; // 8 hours
    public static final String ISSUER   = "mytodolist-local";

    private final MACSigner        signer;
    private final NimbusJwtDecoder decoder;

    public LocalJwtService(@Value("${app.jwt.secret}") String secret) throws Exception {
        byte[] key = secret.getBytes(StandardCharsets.UTF_8);
        if (key.length < 32) {
            throw new IllegalArgumentException("app.jwt.secret must be at least 32 characters");
        }
        this.signer  = new MACSigner(key);
        this.decoder = NimbusJwtDecoder
            .withSecretKey(new SecretKeySpec(key, "HmacSHA256"))
            .build();
    }

    public String generateToken(Usuario usuario) throws Exception {
        Date now = new Date();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
            .subject("local:" + usuario.getIdUsuario())
            .issuer(ISSUER)
            .issueTime(now)
            .expirationTime(new Date(now.getTime() + EXPIRY_MS))
            .claim("name",       usuario.getNombreCompleto())
            .claim("username",   usuario.getNombreUsuario())
            .claim("idUsuario",  usuario.getIdUsuario())
            .claim("rol",        usuario.getRol() != null ? usuario.getRol().getNombre() : null)
            // Grants both read and write — mirrors the OCI scopes Spring Security checks.
            .claim("scope", "mytodolist-apiread mytodolist-apiadmin")
            .build();

        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(signer);
        return jwt.serialize();
    }

    public NimbusJwtDecoder getDecoder() {
        return decoder;
    }
}
