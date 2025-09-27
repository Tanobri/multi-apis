import express from "express";
import cors from "cors";
import products from "./data.json" assert { type: "json" };
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4002;
const SERVICE = process.env.SERVICE_NAME || "products-api";
const USERS_API_URL = process.env.USERS_API_URL || "http://users-api:4001";

app.get("/health", (_req, res) => res.json({ status: "ok", service: SERVICE }));

app.get("/products/with-users", async (_req, res) => {
  try {
    const r = await fetch(`${USERS_API_URL}/users`);
    const users = await r.json();
    res.json({
      products,
      usersCount: Array.isArray(users) ? users.length : 0
    });
  } catch (e) {
    res.status(502).json({ error: "No se pudo consultar users-api", detail: String(e) });
  }
});
// GET /products
app.get("/products", (_req, res) => res.json(products));

// GET /products/:id
app.get("/products/:id", (req, res) => {
  const p = products.find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
});

// POST /products (simulado)
app.post("/products", (req, res) => {
  res.status(201).json({
    message: "Simulado: se crearía el producto",
    payload: req.body
  });
});

// Ejemplo de comunicación entre servicios (compose crea la red):
// GET /products/with-users  -> concatena productos con conteo de usuarios (mock)


app.listen(PORT, () => {
  console.log(`✅ ${SERVICE} listening on http://localhost:${PORT}`);
  console.log(`↔️  USERS_API_URL=${USERS_API_URL}`);
});