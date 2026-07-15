-- ============================================================================
--  seed.sql  —  Dados 100% FICTÍCIOS para o laboratório
-- ============================================================================
--  ATENÇÃO: nada aqui é dado real. Nomes, usuários e senhas são inventados
--  só para a aula. NÃO use nenhuma dessas senhas em sistemas de verdade.
--
--  As senhas são gravadas como HASH SHA-256, calculado pela própria função
--  SHA2(texto, 256) do MySQL. A app Node calcula o mesmo hash em JavaScript
--  (crypto sha256), então o login "de verdade" também funciona.
--
--  Tabela de referência (senha em texto puro -> só para você testar o login):
--    admin         -> admin123
--    joana.silva   -> senha123
--    carlos.souza  -> mudar@2024
--    mariana.lima  -> boasenha!
--    pedro.alves   -> pedrinho99
-- ============================================================================

USE sqli_lab;

-- Limpa dados antigos para poder rodar o seed várias vezes sem duplicar.
DELETE FROM usuarios;
DELETE FROM produtos;
ALTER TABLE usuarios AUTO_INCREMENT = 1;
ALTER TABLE produtos AUTO_INCREMENT = 1;

-- ----------------------------------------------------------------------------
--  Usuários fictícios
--  SHA2('admin123', 256) gera o hash em hexadecimal, igual ao que o Node gera.
-- ----------------------------------------------------------------------------
INSERT INTO usuarios (username, senha_hash, papel) VALUES
  ('admin',        SHA2('admin123',   256), 'admin'),
  ('joana.silva',  SHA2('senha123',   256), 'cliente'),
  ('carlos.souza', SHA2('mudar@2024', 256), 'cliente'),
  ('mariana.lima', SHA2('boasenha!',  256), 'gerente'),
  ('pedro.alves',  SHA2('pedrinho99', 256), 'cliente');

-- ----------------------------------------------------------------------------
--  Produtos fictícios (o que aparece na busca do site)
-- ----------------------------------------------------------------------------
INSERT INTO produtos (nome, descricao, preco) VALUES
  ('Notebook Aurora 14',      'Notebook leve com 16GB de RAM e SSD de 512GB',        4299.90),
  ('Mouse Silencioso Pro',    'Mouse sem fio com clique silencioso e 6 botões',        149.90),
  ('Teclado Mecânico Kappa',  'Teclado mecânico compacto com switches marrons',        389.00),
  ('Monitor Vega 27',         'Monitor 27 polegadas QHD 165Hz para produtividade',    1899.99),
  ('Webcam Clarus HD',        'Webcam 1080p com microfone embutido e tampa física',     219.90),
  ('Headset Órion 7.1',       'Headset gamer com som surround e cancelamento de ruído', 459.90),
  ('Hub USB-C Sete Portas',   'Adaptador USB-C com HDMI, leitor SD e 3 portas USB',     279.50),
  ('Cadeira Ergo Confort',    'Cadeira de escritório com apoio lombar ajustável',      1250.00),
  ('SSD Externo Cometa 1TB',  'SSD portátil de 1TB com leitura de 1050 MB/s',           699.00),
  ('Suporte Articulado Zeta', 'Suporte de mesa para monitor com braço articulado',      329.90);
