// ============================================================================
//  app_seguro/db.js  —  Pool de conexões da app SEGURA
// ============================================================================
//  Mesmo banco, mesmo schema da app vulnerável. As diferenças são de
//  CONFIGURAÇÃO DE SEGURANÇA, todas marcadas com "// ✅ SEGURO:".
// ============================================================================

const path = require('path');

// Carrega o mesmo .env da raiz do projeto.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'sqli_lab',

  // ✅ SEGURO: conectamos com o usuário RESTRITO (app_seguro), criado em
  // db/least_privilege.sql, que só tem privilégio de SELECT nas duas tabelas.
  // Princípio do menor privilégio: se algo der muito errado, o estrago máximo
  // possível é "ler" — nunca apagar, alterar ou escalar privilégios.
  user: process.env.DB_SEGURO_USER || 'app_seguro',
  password: process.env.DB_SEGURO_PASSWORD || 'senha_app_seguro',

  // ✅ SEGURO: multipleStatements fica FALSE (é o padrão, deixamos explícito
  // para documentar a intenção). Assim, uma única chamada NÃO pode conter
  // vários comandos separados por ';'. Isso corta pela raiz as "stacked
  // queries" (ex.: '; DROP TABLE usuarios; --). É uma defesa a mais, somada
  // aos prepared statements que já impedem a injeção lá no server.js.
  multipleStatements: false,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
