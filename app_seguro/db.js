// app_seguro/db.js — Pool de conexões da app SEGURA.
// Diferenças de segurança marcadas com "✅ SEGURO" (ver docs/06).

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'sqli_lab',

  // ✅ SEGURO: usuário restrito (só SELECT), criado em db/least_privilege.sql.
  user: process.env.DB_SEGURO_USER || 'app_seguro',
  password: process.env.DB_SEGURO_PASSWORD || 'senha_app_seguro',

  // ✅ SEGURO: sem stacked queries (padrão false, explícito).
  multipleStatements: false,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
