// app_vulneravel/server.js — App com falhas DELIBERADAS de SQL Injection.
// ⚠️ Educacional: inseguro de propósito, rode só localmente.
// A explicação detalhada está em docs/. As falhas estão marcadas com "⚠️ VULNERÁVEL".

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');

const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT_VULN) || 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(express.urlencoded({ extended: false }));

// Valores padrão para todas as telas.
app.use((req, res, next) => {
  res.locals.modo = 'vulneravel';
  res.locals.erro = null;
  res.locals.sqlExecutada = null; // a app vulnerável MOSTRA a SQL (didático)
  res.locals.usuarioLogado = null;
  res.locals.produtos = null;
  res.locals.termo = '';
  next();
});

function hashSenha(senhaTextoPuro) {
  return crypto.createHash('sha256').update(senhaTextoPuro, 'utf8').digest('hex');
}

app.get('/', (req, res) => {
  res.render('login', { titulo: 'Login' });
});

// Login — FALHA #1: login bypass (ver docs/03).
app.post('/login', async (req, res) => {
  const { username, senha } = req.body;
  const senhaHash = hashSenha(senha || '');

  // ⚠️ VULNERÁVEL: input concatenado direto na query (vira código).
  // Numa linha só de propósito: assim o "-- " injetado apaga a checagem de senha.
  const sql =
    `SELECT id, username, papel FROM usuarios ` +
    `WHERE username = '${username}' AND senha_hash = '${senhaHash}'`;

  try {
    const [rows] = await pool.query(sql);

    if (rows.length > 0) {
      return res.render('login', { titulo: 'Login', usuarioLogado: rows[0], sqlExecutada: sql });
    }
    return res.render('login', { titulo: 'Login', erro: 'Usuário ou senha inválidos.', sqlExecutada: sql });
  } catch (err) {
    // ⚠️ VULNERÁVEL: mostra o erro cru do MySQL (vaza a estrutura do banco).
    return res.render('login', {
      titulo: 'Login',
      erro: 'Erro no MySQL: ' + (err.sqlMessage || err.message),
      sqlExecutada: sql,
    });
  }
});

app.get('/logout', (req, res) => res.redirect('/'));

app.get('/busca', (req, res) => {
  res.render('busca', { titulo: 'Busca de produtos' });
});

// Busca — FALHA #2: UNION-based injection (ver docs/04).
app.get('/buscar', async (req, res) => {
  const termo = req.query.q || '';

  // ⚠️ VULNERÁVEL: input concatenado. A consulta tem 4 colunas → permite UNION.
  const sql = `
    SELECT id, nome, descricao, preco
    FROM produtos
    WHERE nome LIKE '%${termo}%'
  `;

  try {
    const [rows] = await pool.query(sql);
    return res.render('resultado', { titulo: 'Busca de produtos', termo, produtos: rows, sqlExecutada: sql });
  } catch (err) {
    return res.render('resultado', {
      titulo: 'Busca de produtos',
      termo,
      produtos: [],
      sqlExecutada: sql,
      erro: 'Erro no MySQL: ' + (err.sqlMessage || err.message),
    });
  }
});

app.listen(PORT, () => {
  console.log(`🔴 App VULNERÁVEL (educacional) em http://localhost:${PORT}`);
});
