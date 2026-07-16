// app_seguro/server.js — A MESMA app, corrigida.
// Ideia central: DADO nunca vira CÓDIGO (prepared statements). Ver docs/05 e docs/06.
// As correções estão marcadas com "✅ SEGURO".

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');

const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT_SEGURO) || 3001;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.locals.modo = 'seguro';
  res.locals.erro = null;
  res.locals.sqlExecutada = null; // ✅ SEGURO: nunca expõe a SQL na tela
  res.locals.usuarioLogado = null;
  res.locals.produtos = null;
  res.locals.termo = '';
  next();
});

function hashSenha(senhaTextoPuro) {
  return crypto.createHash('sha256').update(senhaTextoPuro, 'utf8').digest('hex');
}

// ✅ SEGURO: allowlist de formato do username (camada extra, não substitui o "?").
const USERNAME_PERMITIDO = /^[A-Za-z0-9._@-]{1,50}$/;

app.get('/', (req, res) => {
  res.render('login', { titulo: 'Login' });
});

// Login — correção da FALHA #1 (ver docs/05).
app.post('/login', async (req, res) => {
  const username = (req.body.username || '').trim();
  const senha = req.body.senha || '';

  // ✅ SEGURO: valida o formato antes de consultar (allowlist).
  if (!USERNAME_PERMITIDO.test(username)) {
    return res.render('login', { titulo: 'Login', erro: 'Usuário ou senha inválidos.' });
  }

  const senhaHash = hashSenha(senha);

  // ✅ SEGURO: placeholders "?". Os valores vão separados → o input nunca vira SQL.
  const sql = 'SELECT id, username, papel FROM usuarios WHERE username = ? AND senha_hash = ?';

  try {
    const [rows] = await pool.execute(sql, [username, senhaHash]);

    if (rows.length > 0) {
      return res.render('login', { titulo: 'Login', usuarioLogado: rows[0] });
    }
    return res.render('login', { titulo: 'Login', erro: 'Usuário ou senha inválidos.' });
  } catch (err) {
    // ✅ SEGURO: detalhe só no log; na tela, mensagem genérica.
    console.error('[app_seguro] Erro no login:', err.message);
    return res.render('login', {
      titulo: 'Login',
      erro: 'Não foi possível processar o login agora. Tente novamente.',
    });
  }
});

app.get('/logout', (req, res) => res.redirect('/'));

app.get('/busca', (req, res) => {
  res.render('busca', { titulo: 'Busca de produtos' });
});

// Busca — correção da FALHA #2 (ver docs/05).
app.get('/buscar', async (req, res) => {
  const termo = String(req.query.q || '').slice(0, 100); // ✅ SEGURO: limita o tamanho

  // ✅ SEGURO: placeholder "?" no LIKE; o padrão '%termo%' vai como valor.
  const sql = 'SELECT id, nome, descricao, preco FROM produtos WHERE nome LIKE ?';

  try {
    const [rows] = await pool.execute(sql, [`%${termo}%`]);
    return res.render('resultado', { titulo: 'Busca de produtos', termo, produtos: rows });
  } catch (err) {
    console.error('[app_seguro] Erro na busca:', err.message);
    return res.render('resultado', {
      titulo: 'Busca de produtos',
      termo,
      produtos: [],
      erro: 'Não foi possível realizar a busca agora. Tente novamente.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`🟢 App SEGURA (educacional) em http://localhost:${PORT}`);
});
