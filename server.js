const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'ruan-game-store-secret-troque-isso-depois',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // carrinho dura 1 dia
}));

// garante que sempre existe um carrinho na sessão
app.use((req, res, next) => {
  if (!req.session.cart) req.session.cart = []; // [{ productId, qty }]
  next();
});

function getCartWithDetails(cart) {
  const items = cart.map(entry => {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(entry.productId);
    if (!product) return null;
    return { ...product, qty: entry.qty, subtotal: product.price * entry.qty };
  }).filter(Boolean);

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, total };
}

// ---------- Loja ----------
app.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY id').all();
  const { items, total } = getCartWithDetails(req.session.cart);
  res.render('index', { products, cartCount: items.reduce((n, i) => n + i.qty, 0), cartTotal: total });
});

// ---------- API do carrinho ----------
app.post('/api/cart/add', (req, res) => {
  const { productId } = req.body;
  const id = Number(productId);
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(id);
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

  const existing = req.session.cart.find(i => i.productId === id);
  if (existing) {
    existing.qty += 1;
  } else {
    req.session.cart.push({ productId: id, qty: 1 });
  }

  const { items, total } = getCartWithDetails(req.session.cart);
  res.json({ items, total, count: items.reduce((n, i) => n + i.qty, 0) });
});

app.post('/api/cart/remove', (req, res) => {
  const { productId } = req.body;
  const id = Number(productId);
  req.session.cart = req.session.cart.filter(i => i.productId !== id);

  const { items, total } = getCartWithDetails(req.session.cart);
  res.json({ items, total, count: items.reduce((n, i) => n + i.qty, 0) });
});

app.get('/api/cart', (req, res) => {
  const { items, total } = getCartWithDetails(req.session.cart);
  res.json({ items, total, count: items.reduce((n, i) => n + i.qty, 0) });
});

// ---------- Checkout (sem Pix ainda — isso é a Fase 2) ----------
app.post('/api/checkout', (req, res) => {
  const { contact } = req.body;
  if (!contact) return res.status(400).json({ error: 'Informe seu contato (Discord/e-mail)' });

  const { items, total } = getCartWithDetails(req.session.cart);
  if (items.length === 0) return res.status(400).json({ error: 'Carrinho vazio' });

  const insert = db.prepare(`
    INSERT INTO orders (customer_contact, items_json, total, status)
    VALUES (?, ?, ?, 'pendente')
  `);
  const result = insert.run(contact, JSON.stringify(items), total);

  req.session.cart = []; // limpa o carrinho depois do pedido

  res.json({ orderId: result.lastInsertRowid, total });
});

app.listen(PORT, () => {
  console.log(`Ruan Game Store rodando em http://localhost:${PORT}`);
});
