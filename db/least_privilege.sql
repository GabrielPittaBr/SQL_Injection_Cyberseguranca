-- ============================================================================
--  least_privilege.sql  —  Usuário MySQL restrito para a app SEGURA
-- ============================================================================
--  PRINCÍPIO DO MENOR PRIVILÉGIO (least privilege):
--  cada componente do sistema deve ter APENAS as permissões estritamente
--  necessárias para funcionar — nada além disso.
--
--  A app segura só precisa LER as tabelas usuarios e produtos (SELECT).
--  Ela nunca insere, atualiza nem apaga nada. Então criamos um usuário que
--  só tem SELECT. É a última linha de defesa: mesmo que, por absurdo, uma
--  injeção passasse, este usuário NÃO conseguiria fazer DROP TABLE,
--  UPDATE, DELETE, criar usuários, ler outros bancos, etc.
--
--  Compare com a app vulnerável, que no laboratório conecta como 'root'
--  (poder total) — o pior cenário possível, justamente para mostrar o
--  estrago que um usuário com privilégio demais permite.
-- ============================================================================

USE sqli_lab;

-- Cria (ou recria) o usuário restrito.
--  '%' = pode conectar de qualquer host (necessário porque a app roda fora do
--  container Docker e conecta pela rede). Em produção você restringiria o host.
DROP USER IF EXISTS 'app_seguro'@'%';
CREATE USER 'app_seguro'@'%' IDENTIFIED BY 'senha_app_seguro';

-- Concede SOMENTE SELECT, e SOMENTE nas duas tabelas do laboratório.
--  Nada de INSERT/UPDATE/DELETE/DROP/CREATE. Nada em outros bancos.
GRANT SELECT ON sqli_lab.usuarios TO 'app_seguro'@'%';
GRANT SELECT ON sqli_lab.produtos TO 'app_seguro'@'%';

-- Aplica as mudanças de privilégio imediatamente.
FLUSH PRIVILEGES;

-- ----------------------------------------------------------------------------
--  Como conferir o que esse usuário pode fazer:
--    SHOW GRANTS FOR 'app_seguro'@'%';
--  Resultado esperado (resumido):
--    GRANT USAGE ON *.* TO `app_seguro`@`%`
--    GRANT SELECT ON `sqli_lab`.`usuarios` TO `app_seguro`@`%`
--    GRANT SELECT ON `sqli_lab`.`produtos` TO `app_seguro`@`%`
--
--  Teste rápido do menor privilégio (deve DAR ERRO de permissão):
--    -- conectado como app_seguro:
--    DELETE FROM produtos;    -- ERRO: command denied
--    DROP TABLE usuarios;     -- ERRO: command denied
-- ----------------------------------------------------------------------------
