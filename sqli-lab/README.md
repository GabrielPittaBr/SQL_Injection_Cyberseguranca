# 🧪 Laboratório de SQL Injection (educacional)

Um laboratório **didático** com duas versões da mesma aplicação web:

- 🔴 **App vulnerável** (porta **3000**) — com falhas de SQL Injection **de
  propósito**, para você *ver o ataque acontecer*.
- 🟢 **App segura** (porta **3001**) — a *mesma* aplicação, corrigida, para você
  *ver a defesa funcionar*.

Stack: **Node.js + Express + EJS + mysql2** (com pool de conexões e
`mysql2/promise`), **MySQL 8** via **Docker**, config por **dotenv**.

---

> # ⚠️ AVISO ÉTICO E DE ISOLAMENTO — LEIA ANTES DE RODAR
>
> - Este projeto é **intencionalmente vulnerável** e existe **apenas para fins
>   educacionais** (uma aula prática de segurança).
> - Rode **somente na sua máquina**, em ambiente **local e isolado**.
> - **JAMAIS** exponha estas aplicações (nem o MySQL) **à internet** ou a uma
>   rede compartilhada. Não faça deploy. Não coloque em servidor público.
> - Todos os dados são **fictícios**. Não use dados reais, nem as senhas daqui
>   em qualquer outro sistema.
> - Testar sistemas de terceiros sem autorização é **crime**. Use estas técnicas
>   só para **defender** melhor os seus próprios sistemas.

---

## 📁 Estrutura do projeto

```
sqli-lab/
├── README.md                 ← você está aqui
├── package.json
├── docker-compose.yml        ← sobe o MySQL 8 já pronto
├── .env.example              ← copie para .env
├── db/
│   ├── schema.sql            ← cria database + tabelas
│   ├── seed.sql              ← dados 100% fictícios
│   └── least_privilege.sql   ← usuário MySQL restrito (só SELECT)
├── payloads.md               ← cheat-sheet de payloads prontos
├── app_vulneravel/           ← app com as falhas (porta 3000)
│   ├── server.js
│   ├── db.js
│   └── views/  (login.ejs, busca.ejs, resultado.ejs, layout.ejs)
├── app_seguro/               ← app corrigida (porta 3001)
│   ├── server.js
│   ├── db.js
│   └── views/
└── docs/                     ← material didático (leia em ordem)
    ├── 01-o-que-e-sql-injection.md
    ├── 02-anatomia-do-ataque.md
    ├── 03-demo-login-bypass.md
    ├── 04-demo-union-extraction.md
    ├── 05-mitigacao-prepared-statements.md
    ├── 06-mitigacao-defesa-em-camadas.md
    └── 07-roteiro-da-apresentacao.md
```

---

## ✅ Pré-requisitos

- **Node.js 18+** e **npm** — <https://nodejs.org>
- **Docker Desktop** (caminho recomendado) — <https://www.docker.com/products/docker-desktop/>
  - *Ou* um **MySQL 8** instalado localmente (caminho alternativo, mais abaixo).

Todos os comandos abaixo são executados **de dentro da pasta `sqli-lab/`**.

---

## 🚀 Como rodar (caminho recomendado: Docker)

### 1) Suba o MySQL com Docker

```bash
docker compose up -d
```

Isso baixa o MySQL 8, cria o banco `sqli_lab` e, **na primeira subida**, aplica
automaticamente, nesta ordem: `schema.sql` → `seed.sql` → `least_privilege.sql`.

Confira se está pronto (aguarde ficar "healthy"):

```bash
docker compose ps
```

### 2) Instale as dependências do Node

```bash
npm install
```

### 3) Crie o seu arquivo `.env`

```bash
# Windows (PowerShell):
Copy-Item .env.example .env

# Linux / macOS:
cp .env.example .env
```

Os valores padrão do `.env.example` já batem com o `docker-compose.yml` — não
precisa mudar nada para o caminho Docker.

### 4) Suba as duas apps ao mesmo tempo

```bash
npm run dev
```

Isso roda a **vulnerável** e a **segura** juntas (usando `concurrently`):

- 🔴 Vulnerável: <http://localhost:3000>
- 🟢 Segura:     <http://localhost:3001>

> Prefere terminais separados? Abra dois terminais e rode:
> ```bash
> npm run start:vuln     # porta 3000
> npm run start:seguro   # porta 3001
> ```

Pronto! Agora siga o passo a passo em [`docs/03-demo-login-bypass.md`](docs/03-demo-login-bypass.md)
e [`docs/04-demo-union-extraction.md`](docs/04-demo-union-extraction.md).

---

## 🔑 Credenciais de teste (fictícias)

Para demonstrar o **login normal** antes de atacar:

| Usuário        | Senha        | Papel   |
|----------------|--------------|---------|
| `admin`        | `admin123`   | admin   |
| `joana.silva`  | `senha123`   | cliente |
| `carlos.souza` | `mudar@2024` | cliente |
| `mariana.lima` | `boasenha!`  | gerente |
| `pedro.alves`  | `pedrinho99` | cliente |

> São dados de laboratório. Não reutilize essas senhas em lugar nenhum.

---

## 🧰 Caminho alternativo: MySQL instalado localmente (sem Docker)

Se você já tem um **MySQL 8** rodando na máquina, dá para pular o Docker.

### 1) Aplique os scripts SQL (nesta ordem)

Substitua `-u root` pelo seu usuário administrador do MySQL:

```bash
mysql -u root -p < db/schema.sql
mysql -u root -p < db/seed.sql
mysql -u root -p < db/least_privilege.sql
```

> No Windows, se `mysql` não for reconhecido, use o caminho completo do
> executável, por exemplo:
> `& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < db/schema.sql`

### 2) Ajuste o `.env` para o seu MySQL

Edite o `.env` e aponte usuário/senha do **root** (usado pela app vulnerável)
para os do seu MySQL local. Exemplo:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sqli_lab

# App vulnerável (privilégio alto — use seu root local):
DB_VULN_USER=root
DB_VULN_PASSWORD=SUA_SENHA_DO_ROOT
PORT_VULN=3000

# App segura (usuário restrito criado pelo least_privilege.sql):
DB_SEGURO_USER=app_seguro
DB_SEGURO_PASSWORD=senha_app_seguro
PORT_SEGURO=3001
```

> Se quiser trocar a senha do usuário `app_seguro`, edite tanto o
> `db/least_privilege.sql` (antes de aplicá-lo) quanto o `.env`.

### 3) Instale e rode

```bash
npm install
npm run dev
```

---

## 🔁 Recomeçar do zero (resetar o banco)

Se você rodou a **demo bônus destrutiva** (stacked queries que apagam/alteram
dados) e quer o banco limpo de novo:

```bash
# Com Docker (apaga o volume e recria tudo do schema/seed):
docker compose down -v
docker compose up -d
```

Com MySQL local, basta reaplicar `schema.sql` e `seed.sql` (o `schema.sql` já
faz `DROP TABLE` das tabelas antes de recriá-las).

---

## 🩺 Solução de problemas

| Sintoma | Provável causa / solução |
|---------|--------------------------|
| App mostra erro de conexão ao subir | O MySQL ainda não está pronto. Rode `docker compose ps` e espere ficar "healthy". |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL não está no ar, ou a porta 3306 está ocupada por outro MySQL. Pare o outro serviço ou mude a porta no `docker-compose.yml` **e** no `.env`. |
| `Access denied for user 'app_seguro'` | O `least_privilege.sql` não foi aplicado. Com Docker: `docker compose down -v && docker compose up -d`. Local: reaplique o script. |
| Porta 3000/3001 já em uso | Feche o processo que usa a porta, ou mude `PORT_VULN`/`PORT_SEGURO` no `.env`. |
| Login normal (`admin`/`admin123`) não funciona | O `seed.sql` não rodou. Reaplique o seed. |
| `-- ` não comenta no navegador | O navegador "comeu" o espaço obrigatório. Use `#` (ex.: `admin'#`). |

---

## 📚 Por onde estudar (ordem sugerida)

1. [`docs/01-o-que-e-sql-injection.md`](docs/01-o-que-e-sql-injection.md) — conceito e analogia.
2. [`docs/02-anatomia-do-ataque.md`](docs/02-anatomia-do-ataque.md) — como a query se rompe.
3. [`docs/03-demo-login-bypass.md`](docs/03-demo-login-bypass.md) — demo: entrar sem senha.
4. [`docs/04-demo-union-extraction.md`](docs/04-demo-union-extraction.md) — demo: vazar senhas.
5. [`docs/05-mitigacao-prepared-statements.md`](docs/05-mitigacao-prepared-statements.md) — a correção de raiz.
6. [`docs/06-mitigacao-defesa-em-camadas.md`](docs/06-mitigacao-defesa-em-camadas.md) — camadas extras.
7. [`docs/07-roteiro-da-apresentacao.md`](docs/07-roteiro-da-apresentacao.md) — roteiro de ~18 min.
8. [`payloads.md`](payloads.md) — cheat-sheet para colar durante a demo.

---

## 🧑‍🏫 Resumo das diferenças (vulnerável × segura)

| Aspecto | 🔴 Vulnerável (:3000) | 🟢 Segura (:3001) |
|---------|----------------------|-------------------|
| Monta a query | Concatena input (`pool.query` + template string) | Prepared statement (`pool.execute` + `?`) |
| Validação de entrada | Nenhuma | Allowlist de formato + limite de tamanho |
| Erros na tela | Mostra `err.sqlMessage` cru | Mensagem neutra; detalhe só no log |
| Usuário do banco | `root` (privilégio máximo) | `app_seguro` (só `SELECT`) |
| `multipleStatements` | `true` (permite stacked queries) | `false` |
| Exemplo com ORM | — | Comentado no fim de `app_seguro/server.js` |
