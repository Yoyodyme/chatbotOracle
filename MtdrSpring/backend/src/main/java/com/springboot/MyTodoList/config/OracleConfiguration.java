package com.springboot.MyTodoList.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.io.File;

/**
 * Provides the primary JDBC {@link DataSource} bean backed by a HikariCP connection pool
 * targeting Oracle Autonomous Database; resolves all connection properties from environment
 * variables so that no credentials are stored in source code.
 */
@Configuration
public class OracleConfiguration {

    Logger logger = LoggerFactory.getLogger(OracleConfiguration.class);

    @Value("${ORACLE_DB_USERNAME}")
    private String dbUsername;

    @Value("${ORACLE_DB_PASSWORD}")
    private String dbPassword;

    /**
     * Resolves the Oracle Wallet path and JDBC URL from environment variables,
     * applies Oracle-specific JVM system properties required for TLS and SSO wallet
     * authentication, then constructs a HikariCP pool sized for a free-tier ADB instance
     * (max 5 connections, min 2 idle, {@code SELECT 1 FROM DUAL} keep-alive query).
     *
     * @return a fully initialised {@link HikariDataSource} ready to serve JDBC connections
     */
    @Bean
    public DataSource dataSource() {
        String walletPath = System.getenv().getOrDefault("WALLET_PATH",
                new File("wallet").getAbsolutePath().replace("\\", "/"));

        // TNS_ADMIN: donde Oracle JDBC busca tnsnames.ora, ojdbc.properties y sqlnet.ora
        System.setProperty("oracle.net.tns_admin", walletPath);

        // Wallet location (SSO wallet — cwallet.sso, sin contraseña)
        System.setProperty("oracle.net.wallet_location",
                "(SOURCE=(METHOD=FILE)(METHOD_DATA=(DIRECTORY=" + walletPath + ")))");

        // JVM SSL truststore — permite que el JDK valide el certificado de Oracle ADB.
        // WALLET_PASSWORD es la contraseña elegida al descargar el wallet desde la consola OCI.
        String walletPassword = System.getenv("WALLET_PASSWORD");
        if (walletPassword != null && !walletPassword.isBlank()) {
            System.setProperty("javax.net.ssl.trustStore", walletPath + "/truststore.jks");
            System.setProperty("javax.net.ssl.trustStorePassword", walletPassword);
            System.setProperty("javax.net.ssl.keyStore", walletPath + "/keystore.jks");
            System.setProperty("javax.net.ssl.keyStorePassword", walletPassword);
            logger.info("JVM SSL truststore configurado con WALLET_PASSWORD");
        }

        String jdbcUrl = System.getenv().getOrDefault("DB_URL",
                "jdbc:oracle:thin:@yoyodymemavyk_high?TNS_ADMIN=" + walletPath);

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(dbUsername);
        config.setPassword(dbPassword);
        config.setDriverClassName("oracle.jdbc.OracleDriver");
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30_000);
        config.setIdleTimeout(600_000);
        config.setMaxLifetime(1_800_000);
        config.setConnectionTestQuery("SELECT 1 FROM DUAL");
        config.setPoolName("YoyodynePool");

        logger.info("Oracle Cloud ADB HikariCP DataSource configured");
        logger.info("Wallet path: {}", walletPath);

        return new HikariDataSource(config);
    }
}
