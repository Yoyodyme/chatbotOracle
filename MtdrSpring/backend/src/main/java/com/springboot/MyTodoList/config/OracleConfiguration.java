package com.springboot.MyTodoList.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    @Bean
    public DataSource dataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();

        // Ruta relativa al directorio donde se ejecuta Maven (MtdrSpring/backend/)
        // Funciona en cualquier máquina sin configuración adicional
        String walletPath = new File("wallet").getAbsolutePath().replace("\\", "/");

        // 1. TNS_ADMIN: donde Oracle JDBC busca tnsnames.ora y sqlnet.ora
        System.setProperty("oracle.net.tns_admin", walletPath);

        // 2. Wallet location: donde están cwallet.sso / ewallet.p12
        System.setProperty("oracle.net.wallet_location",
                "(SOURCE=(METHOD=FILE)(METHOD_DATA=(DIRECTORY=" + walletPath + ")))");

        // 3. URL con descriptor completo de tnsnames.ora (eq51db_high)
        String jdbcUrl = "jdbc:oracle:thin:@(description=" +
                "(retry_count=20)(retry_delay=3)" +
                "(address=(protocol=tcps)(port=1522)(host=adb.mx-queretaro-1.oraclecloud.com))" +
                "(connect_data=(service_name=gbe09837a45665c_eq51db_high.adb.oraclecloud.com))" +
                "(security=(ssl_server_dn_match=yes)))";

        dataSource.setDriverClassName("oracle.jdbc.OracleDriver");
        dataSource.setUrl(jdbcUrl);
        dataSource.setUsername("ADMIN");
        dataSource.setPassword("gWGa#BR%9@1peRbN");

        logger.info("Oracle Cloud ADB DataSource configured");
        logger.info("Wallet path: {}", walletPath);

        return dataSource;
    }
}
