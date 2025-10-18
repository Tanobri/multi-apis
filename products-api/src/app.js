import express from "express";
import cors from "cors";
import fetch from "node-fetch";               // si usas Node 20 también tienes global fetch
import { pool } from "./db.js";
import { getCosmosContainer } from "./db.cosmos.js";
import productsData from "./data.json" assert { type: "json" };

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4002;
const USERS_API_URL = process.env.USERS_API_URL || "http://users-api:4001";

// --- Healths ---
app.get("/health", (_req, res) => res.json({ status: "ok", service: "products-api" }));
app.get("/db/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: r.rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- CRUD PRODUCTS ---

app.get("/cosmos/health", async (_req, res) => {
  try {
    const container = await getCosmosContainer();
    const { resources } = await container.items.query("SELECT VALUE 1").fetchNext();
    res.json({ ok: resources?.[0] === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- COSMOS: CRUD paralelo a /products ---

// Listar productos por userId  -> GET /cosmos/products?userId=u1
app.get("/cosmos/products", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  try {
    const container = await getCosmosContainer();
    const query = {
      query: "SELECT * FROM c WHERE c.userId = @userId",
      parameters: [{ name: "@userId", value: userId }],
    };
    const { resources } = await container.items.query(query, { partitionKey: userId }).fetchAll();
    res.json(resources);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Crear producto  -> POST /cosmos/products   body: { id, name, price, userId }
app.post("/cosmos/products", async (req, res) => {
  const { id, name, price, userId } = req.body || {};
  if (!id || !name || price == null || !userId) {
    return res.status(400).json({ error: "id, name, price, userId are required" });
  }
  try {
    const container = await getCosmosContainer();
    const { resource } = await container.items.create({ id, name, price, userId });
    res.status(201).json(resource);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Actualizar (upsert) -> PUT /cosmos/products/:id   body: { name?, price?, userId }
app.put("/cosmos/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId is required" });

  try {
    const container = await getCosmosContainer();
    const { resource: existing } = await container.item(id, userId).read();
    const doc = { ...(existing || { id, userId }), ...(name != null ? { name } : {}), ...(price != null ? { price } : {}) };
    const { resource } = await container.items.upsert(doc, { partitionKey: userId });
    res.json(resource);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Eliminar -> DELETE /cosmos/products/:id?userId=u1
app.delete("/cosmos/products/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  try {
    const container = await getCosmosContainer();
    await container.item(id, userId).delete();
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Seed rápido para Cosmos -> POST /cosmos/seed?userId=u1
app.post("/cosmos/seed", async (req, res) => {
  const userId = req.query.userId || "u1";
  try {
    const container = await getCosmosContainer();

    // data.json trae id numérico y sin userId; aquí lo adaptamos
    const docs = productsData.map(p => ({
      ...p,
      id: String(p.id),   // Cosmos espera id como string
      userId
    }));

    await Promise.all(
      docs.map(doc => container.items.upsert(doc, { partitionKey: userId }))
    );

    res.json({ inserted: docs.length, userId });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});














// Crear producto (valida user contra users-api)
app.post("/products", async (req, res) => {
  const { name, price, userId } = req.body ?? {};
  if (!name || price == null || !userId)
    return res.status(400).json({ error: "name, price, userId required" });

  try {
    const u = await fetch(`${USERS_API_URL}/users/${userId}`);
    if (u.status === 404) return res.status(400).json({ error: "user does not exist" });
    if (!u.ok) return res.status(502).json({ error: "users-api error" });

    const r = await pool.query(
      `INSERT INTO products_schema.products(name, price, user_id)
       VALUES($1,$2,$3)
       RETURNING id, name, price, user_id AS "userId", created_at AS "createdAt"`,
      [name, price, userId]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "insert failed", detail: String(e) });
  }
});

// Listar
app.get("/products", async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, name, price, user_id AS "userId", created_at AS "createdAt"
       FROM products_schema.products ORDER BY id ASC`
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// Get uno
app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const r = await pool.query(
      `SELECT id, name, price, user_id AS "userId", created_at AS "createdAt"
       FROM products_schema.products WHERE id=$1`,
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: "product not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// Update
app.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, userId } = req.body ?? {};
  if (!name || price == null || !userId)
    return res.status(400).json({ error: "name, price, userId required" });

  try {
    const u = await fetch(`${USERS_API_URL}/users/${userId}`);
    if (u.status === 404) return res.status(400).json({ error: "user does not exist" });
    if (!u.ok) return res.status(502).json({ error: "users-api error" });

    const r = await pool.query(
      `UPDATE products_schema.products
       SET name=$1, price=$2, user_id=$3, updated_at=NOW()
       WHERE id=$4
       RETURNING id, name, price, user_id AS "userId"`,
      [name, price, userId, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: "product not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "update failed", detail: String(e) });
  }
});

// Delete
app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const r = await pool.query(
      "DELETE FROM products_schema.products WHERE id=$1 RETURNING id",
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: "product not found" });
    res.json({ deleted: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: "delete failed", detail: String(e) });
  }
});

// Endpoint que consulta a users-api
app.get("/products/:id/with-user", async (req, res) => {
  const { id } = req.params;
  try {
    const pr = await pool.query(
      `SELECT id, name, price, user_id AS "userId"
       FROM products_schema.products WHERE id=$1`,
      [id]
    );
    if (pr.rows.length === 0) return res.status(404).json({ error: "product not found" });
    const product = pr.rows[0];

    const u = await fetch(`${USERS_API_URL}/users/${product.userId}`);
    if (!u.ok) return res.status(502).json({ error: "users-api error" });
    const user = await u.json();

    res.json({ product, user });
  } catch (e) {
    res.status(500).json({ error: "join failed", detail: String(e) });
  }
});

app.listen(PORT, () => console.log(`✅ products-api on http://localhost:${PORT}`));
