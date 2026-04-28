package com.springboot.MyTodoList.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.io.File;

@Configuration
@Profile("!dev")
public class OracleConfiguration {
    Logger logger = LoggerFactory.getLogger(OracleConfiguration.class);

    @Value("${ORACLE_DB_USERNAME}")
    private String dbUsername;

    @Value("${ORACLE_DB_PASSWORD}")
    private String dbPassword;

    @Bean
    public DataSource dataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();

        // Ruta relativa al directorio donde se ejecuta Maven (MtdrSpring/backend/)
        String walletPath = System.getenv().getOrDefault("WALLET_PATH",
                new File("wallet").getAbsolutePath().replace("\\", "/"));

        // TNS_ADMIN: donde Oracle JDBC busca tnsnames.ora y sqlnet.ora
        System.setProperty("oracle.net.tns_admin", walletPath);

        // Wallet location
        System.setProperty("oracle.net.wallet_location",
                "(SOURCE=(METHOD=FILE)(METHOD_DATA=(DIRECTORY=" + walletPath + ")))");

        String jdbcUrl = System.getenv().getOrDefault("DB_URL",
                "jdbc:oracle:thin:@yoyodymemavyk_high?TNS_ADMIN=" + walletPath);

        dataSource.setDriverClassName("oracle.jdbc.OracleDriver");
        dataSource.setUrl(jdbcUrl);
        dataSource.setUsername(dbUsername);
        dataSource.setPassword(dbPassword);

        logger.info("Oracle Cloud ADB DataSource configured");
        logger.info("Wallet path: {}", walletPath);

        return dataSource;
    }
}
