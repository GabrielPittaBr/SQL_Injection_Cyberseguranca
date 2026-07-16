// ============================================================================
//  app_vulneravel/server.js  —  App com falhas DELIBERADAS de SQL Injection
// ============================================================================
//  ⚠️  AMBIENTE EDUCACIONAL. Este servidor é inseguro DE PROPÓSITO.
//      Roda apenas localmente para a aula. NUNCA exponha na internet.
//
//  Todas as falhas estão marcadas com  "// ⚠️ VULNERÁVEL:"  e explicadas.
//  A versão corrigida de cada trecho está em ../app_seguro/server.js
//  marcada com "// ✅ SEGURO:".
// ============================================================================

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');

const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT_VULN) || 3000;

// ---- Configuração de views (EJS + layout único) ----------------------------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout'); // usa views/layout.ejs como moldura de todas as telas

// Lê dados de formulários (POST) no formato application/x-www-form-urlencoded.
app.use(express.urlencoded({ extended: false }));

// Valores padrão disponíveis em TODAS as telas (evita "variável indefinida"
// no EJS e mantém as views idênticas às da app segura).
app.use((req, res, next) => {
  res.locals.modo = 'vulneravel'; // muda só o banner/cor no layout
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

// ============================================================================
//  ROTA: processa o login  —  FALHA #1: LOGIN BYPASS
// ============================================================================
app.post('/login', async (req, res) => {
  const { username, senha } = req.body;
  const senhaHash = hashSenha(senha || '');

  // ⚠️ VULNERÁVEL: a query é montada CONCATENANDO o input do usuário direto na
  // string (template literal). O que o usuário digita vira PARTE DO CÓDIGO SQL,
  // não apenas um dado. Digitando  admin' --   ou   ' OR '1'='1' --
  // no campo "username", o atacante muda a lógica da consulta e entra sem senha.
  //
  // Sintaxe de comentário no MySQL: "-- " precisa de UM ESPAÇO depois dos dois
  // traços (ou use "#"). É esse comentário que "apaga" o resto da query.
  //
  // Repare que a query é montada em UMA ÚNICA LINHA. Isso é de propósito: como
  // "-- " comenta apenas até o FIM DA LINHA, um payload como  admin' --  só
  // consegue anular a checagem de senha se o "AND senha_hash = ..." estiver na
  // MESMA linha. (Se a query fosse quebrada em várias linhas, o comentário
  // mataria só o resto da primeira linha e o bypass falharia — detalhe clássico
  // que confunde muita gente.)
  const sql =
    `SELECT id, username, papel FROM usuarios ` +
    `WHERE username = '${username}' AND senha_hash = '${senhaHash}'`;

  try {
    // ⚠️ VULNERÁVEL: pool.query() apenas concatena/interpola e manda a string
    // inteira para o banco. Não existe separação entre "código" e "dados".
    // (A app segura usa pool.execute(sql, [params]) com placeholders "?".)
    const [rows] = await pool.query(sql);

    if (rows.length > 0) {
      // Autenticou (de verdade OU por bypass). Mostra o primeiro usuário achado.
      return res.render('login', {
        titulo: 'Login',
        usuarioLogado: rows[0],
        sqlExecutada: sql,
      });
    }

    return res.render('login', {
      titulo: 'Login',
      erro: 'Usuário ou senha inválidos.',
      sqlExecutada: sql,
    });
  } catch (err) {
    // ⚠️ VULNERÁVEL: mostramos o ERRO CRU do MySQL na tela (err.sqlMessage).
    // Isso é "error-based information disclosure": o atacante lê a mensagem de
    // erro e descobre nomes de colunas, tipos, estrutura da query... Um prato
    // cheio para refinar o ataque. (A app segura NUNCA mostra isso ao usuário.)
    return res.render('login', {
      titulo: 'Login',
      erro: 'Erro no MySQL: ' + (err.sqlMessage || err.message),
      sqlExecutada: sql,
    });
  }
});

app.get('/logout', (req, res) => res.redirect('/'));

// ============================================================================
//  ROTA: tela de busca de produtos
// ============================================================================
app.get('/busca', (req, res) => {
  res.render('busca', { titulo: 'Busca de produtos' });
});

// ============================================================================
//  ROTA: executa a busca  —  FALHA #2: UNION-BASED INJECTION
// ============================================================================
app.get('/buscar', async (req, res) => {
  const termo = req.query.q || '';

  // ⚠️ VULNERÁVEL: de novo, o input entra concatenado direto na query. Como a
  // consulta tem 4 colunas (id, nome, descricao, preco), o atacante pode fechar
  // a string e emendar um UNION SELECT com 4 colunas vindas de OUTRA tabela,
  // extraindo, por exemplo, username e senha_hash de "usuarios".
  //
  // Payload típico no campo de busca:
  //   ' UNION SELECT id, username, senha_hash, papel FROM usuarios --
  const sql = `
    SELECT id, nome, descricao, preco
    FROM produtos
    WHERE nome LIKE '%${termo}%'
  `;

  try {
    // ⚠️ VULNERÁVEL: pool.query() com a string já concatenada.
    const [rows] = await pool.query(sql);
    return res.render('resultado', {
      titulo: 'Busca de produtos',
      termo,
      produtos: rows,
      sqlExecutada: sql, // mostramos a SQL na tela (didático)
    });
  } catch (err) {
    // ⚠️ VULNERÁVEL: erro cru do MySQL na tela de novo. Útil para o atacante
    // descobrir o número de colunas (ex.: ORDER BY 5 -> "Unknown column '5'").
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
  console.log('====================================================');
  console.log(' 🔴 APP VULNERÁVEL (educacional) no ar');
  console.log(`    http://localhost:${PORT}`);
  console.log('    NÃO exponha na internet. Uso didático apenas.');
  console.log('====================================================');
});
