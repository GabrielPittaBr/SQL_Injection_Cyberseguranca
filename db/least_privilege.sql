-- least_privilege.sql — Usuário MySQL restrito (só SELECT) para a app SEGURA.
-- Menor privilégio: mesmo que uma injeção passasse, este usuário não consegue
-- apagar nem alterar nada — só ler as duas tabelas. Ver docs/06.

USE sqli_lab;

DROP USER IF EXISTS 'app_seguro'@'%';
CREATE USER 'app_seguro'@'%' IDENTIFIED BY 'senha_app_seguro';

-- Só SELECT, e só nas tabelas do laboratório. Nada de INSERT/UPDATE/DELETE/DROP.
GRANT SELECT ON sqli_lab.usuarios TO 'app_seguro'@'%';
GRANT SELECT ON sqli_lab.produtos TO 'app_seguro'@'%';

FLUSH PRIVILEGES;

-- Conferir:  SHOW GRANTS FOR 'app_seguro'@'%';
-- Testar o menor privilégio (deve dar erro de permissão):
--   DELETE FROM produtos;    -- ERRO: command denied
