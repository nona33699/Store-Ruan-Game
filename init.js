// Cria o banco de dados e a tabela de produtos, se ainda não existirem.
// Roda automaticamente toda vez que o servidor inicia (não apaga dados existentes).
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'store.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    rarity TEXT NOT NULL,
    image_url TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_contact TEXT NOT NULL,
    items_json TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Só popula com os produtos padrão se a tabela estiver vazia
// (assim não duplica toda vez que o servidor reinicia)
const count = db.prepare('SELECT COUNT(*) as total FROM products').get().total;

if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO products (name, price, rarity, image_url)
    VALUES (?, ?, ?, ?)
  `);

  const seedProducts = [
    ['GOD Humano + CDK', 4.50, 'mitica', ''],
    ['GOD Humano + Level Máximo + TTK', 4.50, 'mitica', ''],
    ['Shark Anchor + GOD Humano + Level Máximo', 4.00, 'lendaria', ''],
    ['Sanguine Art + GOD + Level Máximo', 2.80, 'lendaria', ''],
    ['GOD + Dough V2 Full + Level Máximo', 2.00, 'rara', ''],
    ['Conta aleatória', 0.30, 'rara', ''],
  ];

  const insertMany = db.transaction((products) => {
    for (const p of products) insert.run(...p);
  });
  insertMany(seedProducts);
  console.log('Produtos iniciais cadastrados no banco.');
}

module.exports = db;
