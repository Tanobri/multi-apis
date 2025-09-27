import express from "express";
import cors from "cors";
import users from "./data.json" assert { type: "json" };

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;
const SERVICE = process.env.SERVICE_NAME || "users-api";

app.get("/health", (_req, res) => res.json({ status: "ok", service: SERVICE }));

// GET /users
app.get("/users", (_req, res) => res.json(users));

// GET /users/:id
app.get("/users/:id", (req, res) => {
  const u = users.find(x => String(x.id) === String(req.params.id));
  if (!u) return res.status(404).json({ error: "User not found" });
  res.json(u);
});

// POST /users (simulado)
app.post("/users", (req, res) => {
  res.status(201).json({
    message: "Simulado: se crearía el usuario",
    payload: req.body
  });
});

// PUT /users/:id (simulado)
app.put("/users/:id", (req, res) => {
  res.json({
    message: "Simulado: se actualizaría el usuario",
    id: req.params.id,
    payload: req.body
  });
});

// DELETE /users/:id (simulado)
app.delete("/users/:id", (req, res) => {
  res.json({ message: "Simulado: se eliminaría el usuario", id: req.params.id });
});

app.listen(PORT, () => {
  console.log(`✅ ${SERVICE} listening on http://localhost:${PORT}`);
});