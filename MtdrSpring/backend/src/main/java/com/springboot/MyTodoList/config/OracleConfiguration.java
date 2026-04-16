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
        String walletPath = System.getenv().getOrDefault("WALLET_PATH",  new File("wallet").getAbsolutePath());

        // TNS_ADMIN: donde Oracle JDBC busca tnsnames.ora y sqlnet.ora
        System.setProperty("oracle.net.tns_admin", walletPath);

        // Wallet location
        System.setProperty("oracle.net.wallet_location",
                "(SOURCE=(METHOD=FILE)(METHOD_DATA=(DIRECTORY=" + walletPath + ")))");

        String jdbcUrl = "jdbc:oracle:thin:@(description=" +
                "(retry_count=20)(retry_delay=3)" +
                "(address=(protocol=tcps)(port=1522)(host=adb.mx-queretaro-1.oraclecloud.com))" +
                "(connect_data=(service_name=gbe09837a45665c_eq51db_high.adb.oraclecloud.com))" +
                "(security=(ssl_server_dn_match=yes)))";

        dataSource.setDriverClassName("oracle.jdbc.OracleDriver");
        dataSource.setUrl(jdbcUrl);
        dataSource.setUsername(dbUsername);
        dataSource.setPassword(dbPassword);

        logger.info("Oracle Cloud ADB DataSource configured");
        logger.info("Wallet path: {}", walletPath);

        return dataSource;
    }
}
