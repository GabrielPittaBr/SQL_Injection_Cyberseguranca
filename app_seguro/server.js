// ============================================================================
//  app_seguro/server.js  —  A MESMA app, agora CORRIGIDA
// ============================================================================
//  Mesmas telas e mesma funcionalidade da app vulnerável, mas sem as falhas.
//  Cada correção está marcada com  "// ✅ SEGURO:"  e explicada.
//
//  Ideia central: DADO nunca vira CÓDIGO. Usamos prepared statements
//  (pool.execute com placeholders "?"), então o que o usuário digita é sempre
//  tratado como valor, jamais como parte da instrução SQL.
// ============================================================================

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');

const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT_SEGURO) || 3001;

// ---- Configuração de views (idêntica à da app vulnerável) ------------------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: false }));

// Valores padrão para todas as telas.
app.use((req, res, next) => {
  res.locals.modo = 'seguro';
  res.locals.erro = null;
  // ✅ SEGURO: NÃO expomos a SQL executada ao usuário. Fica sempre null.
  res.locals.sqlExecutada = null;
  res.locals.usuarioLogado = null;
  res.locals.produtos = null;
  res.locals.termo = '';
  next();
});

function hashSenha(senhaTextoPuro) {
  return crypto.createHash('sha256').update(senhaTextoPuro, 'utf8').digest('hex');
}

// ✅ SEGURO: allowlist de formato para o nome de usuário. Só aceitamos letras,
// números e alguns símbolos comuns em logins (. _ - @). Validação de entrada
// NÃO substitui o prepared statement — é uma camada a mais (defesa em
// profundidade). Ela rejeita cedo entradas absurdas e reduz a superfície.
const USERNAME_PERMITIDO = /^[A-Za-z0-9._@-]{1,50}$/;

// ============================================================================
//  ROTA: tela de login
// ============================================================================
app.get('/', (req, res) => {
  res.render('login', { titulo: 'Login' });
});

// ============================================================================
//  ROTA: processa o login  —  CORREÇÃO DA FALHA #1
// ============================================================================
app.post('/login', async (req, res) => {
  const username = (req.body.username || '').trim();
  const senha = req.body.senha || '';

  // ✅ SEGURO: valida o formato antes de consultar o banco (allowlist).
  if (!USERNAME_PERMITIDO.test(username)) {
    return res.render('login', {
      titulo: 'Login',
      erro: 'Usuário ou senha inválidos.', // mensagem neutra, sem detalhes
    });
  }

  const senhaHash = hashSenha(senha);

  // ✅ SEGURO: query com PLACEHOLDERS "?". Os valores vão SEPARADOS, no array.
  // O driver envia o comando e os dados por caminhos diferentes ao MySQL
  // (prepared statement), então o texto digitado NUNCA é interpretado como SQL.
  // Payloads como  admin' --   ou  ' OR '1'='1' --  viram apenas um "username"
  // literal que não existe -> nenhum bypass.
  const sql = 'SELECT id, username, papel FROM usuarios WHERE username = ? AND senha_hash = ?';

  try {
    // ✅ SEGURO: usamos pool.execute() (e não pool.query()). O execute() usa o
    // protocolo de prepared statement do MySQL e ainda faz cache do plano.
    const [rows] = await pool.execute(sql, [username, senhaHash]);

    if (rows.length > 0) {
      return res.render('login', { titulo: 'Login', usuarioLogado: rows[0] });
    }
    return res.render('login', { titulo: 'Login', erro: 'Usuário ou senha inválidos.' });
  } catch (err) {
    // ✅ SEGURO: o erro detalhado vai só para o LOG do servidor (para o dev
    // investigar). Ao usuário mostramos uma mensagem GENÉRICA, sem vazar nada
    // sobre a estrutura do banco.
    console.error('[app_seguro] Erro no login:', err.message);
    return res.render('login', {
      titulo: 'Login',
      erro: 'Não foi possível processar o login agora. Tente novamente.',
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
//  ROTA: executa a busca  —  CORREÇÃO DA FALHA #2
// ============================================================================
app.get('/buscar', async (req, res) => {
  // ✅ SEGURO: limita o tamanho do termo (validação simples de entrada).
  const termo = String(req.query.q || '').slice(0, 100);

  // ✅ SEGURO: placeholder "?" para o LIKE. Montamos o padrão '%termo%' em
  // JavaScript e passamos como VALOR. Os caracteres do usuário (incluindo
  // aspas e a palavra UNION) são tratados como texto de busca, não como SQL.
  const sql = 'SELECT id, nome, descricao, preco FROM produtos WHERE nome LIKE ?';

  try {
    const [rows] = await pool.execute(sql, [`%${termo}%`]);
    return res.render('resultado', { titulo: 'Busca de produtos', termo, produtos: rows });
  } catch (err) {
    // ✅ SEGURO: log no servidor, mensagem neutra na tela.
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
  console.log('====================================================');
  console.log(' 🟢 APP SEGURA (educacional) no ar');
  console.log(`    http://localhost:${PORT}`);
  console.log('====================================================');
});

// ============================================================================
//  BÔNUS DIDÁTICO: como ficaria com um ORM (Sequelize)?
// ----------------------------------------------------------------------------
//  Um ORM (Object-Relational Mapper) mapeia tabelas para objetos e, por baixo
//  dos panos, TAMBÉM usa prepared statements / parâmetros — ou seja, resolve
//  o mesmo problema (dado ≠ código), só que com uma sintaxe mais "orientada a
//  objetos". O exemplo abaixo é apenas ILUSTRATIVO e não precisa rodar.
//
//  // 1) Definição do modelo (uma vez, na configuração):
//  const { Sequelize, DataTypes, Op } = require('sequelize');
//  const sequelize = new Sequelize('sqli_lab', 'app_seguro', 'senha_app_seguro', {
//    host: '127.0.0.1', dialect: 'mysql',
//  });
//
//  const Usuario = sequelize.define('Usuario', {
//    username:   { type: DataTypes.STRING },
//    senha_hash: { type: DataTypes.STRING },
//    papel:      { type: DataTypes.STRING },
//  }, { tableName: 'usuarios', timestamps: false });
//
//  const Produto = sequelize.define('Produto', {
//    nome:      { type: DataTypes.STRING },
//    descricao: { type: DataTypes.STRING },
//    preco:     { type: DataTypes.DECIMAL(10, 2) },
//  }, { tableName: 'produtos', timestamps: false });
//
//  // 2) Login — o Sequelize parametriza os valores automaticamente:
//  const usuario = await Usuario.findOne({
//    where: { username: username, senha_hash: senhaHash },
//  });
//  // 'usuario' vem preenchido só se as credenciais baterem. Nenhum payload
//  // com aspas/UNION consegue virar código: o where usa parâmetros.
//
//  // 3) Busca de produtos — LIKE parametrizado via operador Op.like:
//  const produtos = await Produto.findAll({
//    where: { nome: { [Op.like]: `%${termo}%` } },
//  });
//
//  RESUMO DO CONTRASTE:
//   - mysql2 "cru" (este arquivo): você escreve o SQL e usa "?" para os valores.
//     Mais controle e transparência sobre a query.
//   - ORM (Sequelize): você trabalha com objetos/métodos; a biblioteca gera o
//     SQL parametrizado. Menos SQL na mão, mas é bom entender o que ele gera.
//   - AMBOS são seguros contra SQLi PORQUE separam dado de código. A proteção
//     não vem de "usar ORM", e sim de NUNCA concatenar entrada na query.
//   - Atenção: mesmo com ORM, se você usar consultas "raw" concatenando string
//     (ex.: sequelize.query(`... ${input} ...`)), a injeção VOLTA. A regra é
//     sempre a mesma: parametrize.
// ============================================================================
