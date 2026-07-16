// app_vulneravel/db.js — Pool de conexões da app VULNERÁVEL.
// Duas escolhas inseguras de propósito, marcadas com "⚠️ VULNERÁVEL" (ver docs/06).

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'sqli_lab',

  // ⚠️ VULNERÁVEL: conecta como 'root' (privilégio máximo).
  user: process.env.DB_VULN_USER || 'root',
  password: process.env.DB_VULN_PASSWORD || 'root_lab_senha',

  // ⚠️ VULNERÁVEL: permite stacked queries (vários comandos com ';').
  multipleStatements: true,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
