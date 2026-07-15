// ============================================================================
//  app_vulneravel/db.js  —  Pool de conexões da app VULNERÁVEL
// ============================================================================
//  Aqui criamos o pool de conexões com o MySQL usando mysql2/promise.
//  Um "pool" mantém várias conexões prontas e as reaproveita, em vez de
//  abrir/fechar uma conexão a cada requisição (mais rápido e estável).
//
//  Esta é a app de LABORATÓRIO com falhas de propósito. Repare em duas
//  escolhas inseguras já feitas aqui na configuração da conexão.
// ============================================================================

const path = require('path');

// Carrega o .env que fica na RAIZ do projeto (uma pasta acima desta).
// Usar caminho absoluto evita depender de onde o "node" foi executado.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'sqli_lab',

  // ⚠️ VULNERÁVEL: conectamos como 'root' (privilégio máximo). Se uma injeção
  // passar, o atacante herda TODO o poder do root: apagar tabelas, ler outros
  // bancos, criar usuários... É o oposto do "menor privilégio". A app segura
  // usa um usuário que só tem SELECT.
  user: process.env.DB_VULN_USER || 'root',
  password: process.env.DB_VULN_PASSWORD || 'root_lab_senha',

  // ⚠️ VULNERÁVEL: multipleStatements: true permite enviar VÁRIOS comandos SQL
  // separados por ';' numa única chamada (as chamadas "stacked queries").
  // Combinado com concatenação de input, isso deixa o atacante emendar coisas
  // como:  '; DROP TABLE usuarios; --
  // A app segura mantém isso DESLIGADO (padrão false). Veja a demo bônus no
  // server.js e no payloads.md.
  multipleStatements: true,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
