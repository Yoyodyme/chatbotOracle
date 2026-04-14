package com.springboot.MyTodoList.config;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

@Configuration
public class OracleConfiguration {
    Logger logger = LoggerFactory.getLogger(OracleConfiguration.class);
    
    @Bean
    public DataSource dataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();

        // Wallet descargado desde OCI Console para la ADB "chatbotdb"
        // Usar forward slashes — Oracle JDBC los acepta en Windows
        String walletPath = "c:/Users/Usuario/Documents/GitHub/chatbotOracle/MtdrSpring/backend/wallet";

        // 1. TNS_ADMIN: donde Oracle JDBC busca tnsnames.ora y sqlnet.ora
        System.setProperty("oracle.net.tns_admin", walletPath);

        // 2. Wallet location: donde están cwallet.sso / ewallet.p12
        System.setProperty("oracle.net.wallet_location",
                "(SOURCE=(METHOD=FILE)(METHOD_DATA=(DIRECTORY=" + walletPath + ")))");

        // 3. URL usando el descriptor completo de tnsnames.ora (chatbotdb_high)
        //    Incluye la cláusula security requerida para TLS con ADB
        String jdbcUrl = "jdbc:oracle:thin:@(description=" +
                "(retry_count=20)(retry_delay=3)" +
                "(address=(protocol=tcps)(port=1522)(host=adb.mx-queretaro-1.oraclecloud.com))" +
                "(connect_data=(service_name=ge37d1a9881c2e1_chatbotdb_high.adb.oraclecloud.com))" +
                "(security=(ssl_server_dn_match=yes)))";

        dataSource.setDriverClassName("oracle.jdbc.OracleDriver");
        dataSource.setUrl(jdbcUrl);
        dataSource.setUsername("ADMIN");
        dataSource.setPassword("Equipo51_105");

        logger.info("Oracle Cloud ADB DataSource configured");
        logger.info("JDBC URL: {}", jdbcUrl);
        logger.info("TNS Admin / Wallet: {}", walletPath);

        return dataSource;
    }
}
