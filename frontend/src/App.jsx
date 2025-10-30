import { useEffect, useMemo, useState } from "react";
import "./index.css";

/** ---------- Helpers de API ---------- */
const USERS_BASE =
  import.meta.env.VITE_USERS_API_URL?.replace(/\/+$/, "") || "";
const PRODUCTS_BASE =
  import.meta.env.VITE_PRODUCTS_API_URL?.replace(/\/+$/, "") || "";

function withBase(path) {
  if (path.startsWith("/users")) {
    return USERS_BASE ? USERS_BASE + path : path;
  }
  if (path.startsWith("/products")) {
    return PRODUCTS_BASE ? PRODUCTS_BASE + path : path;
  }
  return path;
}

async function apiFetch(path, options = {}) {
  const url = withBase(path);
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  // Lee texto primero para poder mostrar errores bonitos si no es JSON
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Respuesta no es JSON. Primero(s) 80 chars: ${text.slice(0, 80)}`
    );
  }
}

/** ---------- Componentes UI pequeños ---------- */
function Card({ title, children, footer }) {
  return (
    <div className="card">
      <div className="card_head">{title}</div>
      <div className="card_body">{children}</div>
      {footer ? <div className="card_footer">{footer}</div> : null}
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

function SmallBtn({ children, ...props }) {
  return (
    <button className="btn btn-sm" {...props}>
      {children}
    </button>
  );
}

/** ---------- App ---------- */
export default function App() {
  // USERS
  const [users, setUsers] = useState([]);
  const [uForm, setUForm] = useState({ id: "", name: "", email: "" });
  const [uEdit, setUEdit] = useState(null); // id en edición
  // PRODUCTS
  const [products, setProducts] = useState([]);
  const [pForm, setPForm] = useState({ id: "", name: "", price: "", userId: "u1" });
  const [pEdit, setPEdit] = useState(null);
  const [filterUserId, setFilterUserId] = useState("u1");
  // misc
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const apisEnUso = useMemo(
    () => ({
      users: USERS_BASE || "(rewrite a /users)",
      products: PRODUCTS_BASE || "(rewrite a /products)",
    }),
    []
  );

  function ok(m) {
    setMsg(`✅ ${m}`);
    setTimeout(() => setMsg(""), 2500);
  }
  function fail(e) {
    console.error(e);
    setMsg(`❌ ${String(e.message || e)}`);
  }

  /** ----- USERS ----- */
  async function loadUsers() {
    try {
      setLoading(true);
      const data = await apiFetch("/users");
      setUsers(Array.isArray(data) ? data : []);
      ok("Users cargados");
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  async function createUser(e) {
    e?.preventDefault();
    try {
      setLoading(true);
      const body = { ...uForm, id: toStr(uForm.id) };
      await apiFetch("/users", { method: "POST", body: JSON.stringify(body) });
      await loadUsers();
      setUForm({ id: "", name: "", email: "" });
      ok("User creado");
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(e) {
    e?.preventDefault();
    try {
      setLoading(true);
      const body = { name: uForm.name, email: uForm.email };
      await apiFetch(`/users/${encodeURIComponent(toStr(uEdit))}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await loadUsers();
      setUEdit(null);
      setUForm({ id: "", name: "", email: "" });
      ok("User actualizado");
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(id) {
    if (!confirm(`¿Eliminar user ${id}?`)) return;
    try {
      setLoading(true);
      await apiFetch(`/users/${encodeURIComponent(toStr(id))}`, {
        method: "DELETE",
      });
      await loadUsers();
      ok("User eliminado");
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  /** ----- PRODUCTS ----- */
  async function loadProducts(forUserId) {
    try {
      setLoading(true);
      const uid = forUserId ?? filterUserId;
      const data = await apiFetch(`/products?userId=${encodeURIComponent(uid)}`);
      setProducts(Array.isArray(data) ? data : []);
      ok("Products cargados");
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  async function createProduct(e) {
    e?.preventDefault();
    try {
      setLoading(true);
      const body = {
        id: toStr(pForm.id),
        name: pForm.name,
        price: Number(pForm.price),
        userId: pForm.userId,
      };
      await apiFetch(`/products`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await loadProducts(body.userId);
      setPForm({ id: "", name: "", price: "", userId: body.userId });
      ok("Product creado");
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  async function updateProduct(e) {
    e?.preventDefault();
    try {
      setLoading(true);
      const body = {
        name: pForm.name,
        price: Number(pForm.price),
        userId: pForm.userId,
      };
      await apiFetch(`/products/${encodeURIComponent(toStr(pEdit))}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await loadProducts(body.userId);
      setPEdit(null);
      setPForm({ id: "", name: "", price: "", userId: body.userId });
      ok("Product actualizado");
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

async function deleteProduct(id, uidFromItem) {
  const uid = (uidFromItem ?? filterUserId ?? '').trim();
  if (!uid) {
    fail('Falta userId para eliminar');
    return;
  }
  if (!confirm(`¿Eliminar product ${id}?`)) return;

  try {
    setLoading(true);
    await apiFetch(
      `/products/${encodeURIComponent(id)}?userId=${encodeURIComponent(uid)}`,
      { method: 'DELETE' }
    );
    await loadProducts();
    ok('Product eliminado');
  } catch (e) {
    fail(e);
  } finally {
    setLoading(false);
  }
}



  /** Init */
  useEffect(() => {
    loadUsers();
    loadProducts(filterUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Helpers UI */
  function toStr(v) {
    return v == null ? "" : String(v).trim();
  }
  function startEditUser(u) {
    setUEdit(u.id);
    setUForm({ id: u.id, name: u.name || "", email: u.email || "" });
  }
  function startEditProduct(p) {
    setPEdit(p.id);
    setPForm({
      id: p.id,
      name: p.name || "",
      price: p.price ?? "",
      userId: p.userId || "",
    });
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Dashboard</h1>
        <div className="api-badges">
          <span className="badge">
            users → <code>{apisEnUso.users}</code>
          </span>
          <span className="badge">
            products → <code>{apisEnUso.products}</code>
          </span>
        </div>
      </header>

      {msg && <div className="notice">{msg}</div>}

      <div className="grid">
        {/* USERS */}
        <Card
          title="Users (CRUD)"
          footer={
            <div className="row gap">
              <SmallBtn onClick={loadUsers} disabled={loading}>
                Reload
              </SmallBtn>
              {uEdit ? (
                <>
                  <SmallBtn
                    className="btn-ghost"
                    onClick={() => {
                      setUEdit(null);
                      setUForm({ id: "", name: "", email: "" });
                    }}
                  >
                    Cancel
                  </SmallBtn>
                  <span className="hint">Editando: {uEdit}</span>
                </>
              ) : null}
            </div>
          }
        >
          <form
            className="form"
            onSubmit={uEdit ? updateUser : createUser}
            autoComplete="off"
          >
            <Field
              label="id"
              placeholder="string"
              value={uForm.id}
              onChange={(e) => setUForm((f) => ({ ...f, id: e.target.value }))}
              disabled={!!uEdit}
            />
            <Field
              label="name"
              placeholder="Nombre"
              value={uForm.name}
              onChange={(e) => setUForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Field
              label="email"
              placeholder="correo@dominio.com"
              value={uForm.email}
              onChange={(e) => setUForm((f) => ({ ...f, email: e.target.value }))}
            />
            <button className="btn" disabled={loading}>
              {uEdit ? "Update" : "Create"}
            </button>
          </form>

          <ul className="list">
            {users.map((u) => (
              <li key={u.id} className="list_item">
                <div>
                  <div className="title">
                    {u.name} <span className="muted">({u.id})</span>
                  </div>
                  <div className="muted">{u.email}</div>
                </div>
                <div className="row gap">
                  <SmallBtn onClick={() => startEditUser(u)}>Edit</SmallBtn>
                  <SmallBtn className="btn-danger" onClick={() => deleteUser(u.id)}>
                    Delete
                  </SmallBtn>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* PRODUCTS */}
        <Card
          title="Products (CRUD)"
          footer={
            <div className="row gap">
              <label className="field sm">
                <span>userId</span>
                <input
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                />
              </label>
              <SmallBtn onClick={() => loadProducts()} disabled={loading}>
                Reload
              </SmallBtn>
              {pEdit ? (
                <>
                  <SmallBtn
                    className="btn-ghost"
                    onClick={() => {
                      setPEdit(null);
                      setPForm({ id: "", name: "", price: "", userId: filterUserId });
                    }}
                  >
                    Cancel
                  </SmallBtn>
                  <span className="hint">Editando: {pEdit}</span>
                </>
              ) : null}
            </div>
          }
        >
          <form
            className="form"
            onSubmit={pEdit ? updateProduct : createProduct}
            autoComplete="off"
          >
            <Field
              label="id"
              placeholder="string"
              value={pForm.id}
              onChange={(e) => setPForm((f) => ({ ...f, id: e.target.value }))}
              disabled={!!pEdit}
            />
            <Field
              label="name"
              placeholder="Nombre"
              value={pForm.name}
              onChange={(e) => setPForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Field
              label="price"
              placeholder="0.00"
              value={pForm.price}
              onChange={(e) => setPForm((f) => ({ ...f, price: e.target.value }))}
            />
            <Field
              label="userId"
              placeholder="u1"
              value={pForm.userId}
              onChange={(e) => setPForm((f) => ({ ...f, userId: e.target.value }))}
            />
            <button className="btn" disabled={loading}>
              {pEdit ? "Update" : "Create"}
            </button>
          </form>

          <ul className="list">
            {products.map((p) => (
              <li key={p.id} className="list_item">
                <div>
                  <div className="title">
                    {p.name} <span className="muted">({p.id})</span>
                  </div>
                  <div className="muted">
                    ${p.price} — userId: <code>{p.userId}</code>
                  </div>
                </div>
                <div className="row gap">
                  <SmallBtn onClick={() => startEditProduct(p)}>Edit</SmallBtn>
                  <SmallBtn
                    className="btn-danger"
                    onClick={() => deleteProduct(p.id)}
                  >
                    Delete
                  </SmallBtn>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}