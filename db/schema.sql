-- ============================================================================
--  schema.sql  —  Estrutura do banco do laboratório de SQL Injection
-- ============================================================================
--  Este arquivo cria o banco e as DUAS tabelas usadas pelas duas apps
--  (vulnerável e segura). O schema é EXATAMENTE o mesmo para as duas —
--  o que muda entre elas é APENAS o código que consulta o banco.
--
--  Ordem de execução recomendada:
--    1) schema.sql         (este arquivo — cria banco e tabelas)
--    2) seed.sql           (popula com dados fictícios)
--    3) least_privilege.sql (cria o usuário restrito da app segura)
--
--  No docker-compose esses arquivos são aplicados automaticamente na
--  primeira subida do container, na ordem acima.
-- ============================================================================

-- Cria o banco se ainda não existir. utf8mb4 = suporte completo a acentos/emoji.
CREATE DATABASE IF NOT EXISTS sqli_lab
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sqli_lab;

-- Recria as tabelas do zero a cada aplicação do schema (facilita repetir a aula).
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS produtos;

-- ----------------------------------------------------------------------------
--  Tabela usuarios
--  Alvo da demo de LOGIN BYPASS e da demo de UNION (extração de credenciais).
--  senha_hash guarda o SHA-256 da senha (nunca a senha em texto puro).
--  Guardamos como hash por dois motivos:
--    1) é boa prática real (nunca armazenar senha em texto puro);
--    2) deixa a demo de UNION mais realista — o atacante extrai HASHES,
--       exatamente como aconteceria num vazamento de verdade.
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  senha_hash CHAR(64)     NOT NULL,          -- SHA-256 em hexadecimal = 64 chars
  papel      VARCHAR(20)  NOT NULL DEFAULT 'cliente'  -- ex.: 'admin' ou 'cliente'
);

-- ----------------------------------------------------------------------------
--  Tabela produtos
--  Alvo da demo de BUSCA (UNION-based injection). O campo de busca do site
--  filtra por 'nome'. Na app vulnerável, o input entra concatenado direto na
--  query, o que permite injetar um UNION e ler a tabela usuarios.
-- ----------------------------------------------------------------------------
CREATE TABLE produtos (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(120)   NOT NULL,
  descricao VARCHAR(255)   NOT NULL,
  preco     DECIMAL(10,2)  NOT NULL DEFAULT 0.00
);
