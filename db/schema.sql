-- schema.sql — Estrutura do banco do laboratório.
-- O schema é o mesmo para as duas apps; o que muda é só o código que consulta.
-- Ordem de execução: schema.sql → seed.sql → least_privilege.sql (ver README).

CREATE DATABASE IF NOT EXISTS sqli_lab
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sqli_lab;

-- Recria as tabelas do zero a cada aplicação (facilita repetir a aula).
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS produtos;

-- usuarios: alvo do login bypass e da extração via UNION.
-- senha_hash guarda o SHA-256 da senha (nunca a senha em texto puro).
CREATE TABLE usuarios (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  senha_hash CHAR(64)     NOT NULL,          -- SHA-256 em hexadecimal = 64 chars
  papel      VARCHAR(20)  NOT NULL DEFAULT 'cliente'
);

-- produtos: alvo da busca (UNION-based). A busca do site filtra por 'nome'.
CREATE TABLE produtos (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(120)   NOT NULL,
  descricao VARCHAR(255)   NOT NULL,
  preco     DECIMAL(10,2)  NOT NULL DEFAULT 0.00
);
