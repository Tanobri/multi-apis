import { useEffect, useState } from "react";

const USERS_API = import.meta.env.VITE_USERS_API_URL;
const PRODUCTS_API = import.meta.env.VITE_PRODUCTS_API_URL;

export default function App() {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const userId = "u1"; // de momento lo fijamos; luego lo ponemos dinámico
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

// form state
const [form, setForm] = useState({ id: "", name: "", price: "", userId: "u1" });

  useEffect(() => {
    async function load() {
      try {
       const [uRes, pRes] = await Promise.all([
        fetch(`${USERS_API}/users`),
        // 👇 pasamos el userId
         fetch(`${PRODUCTS_API}/products?userId=${encodeURIComponent(userId)}`),
       ]);
        
        if (!uRes.ok || !pRes.ok) {
          throw new Error(`Fetch failed: users=${uRes.status}, products=${pRes.status}`);
        }

        const [u, p] = await Promise.all([uRes.json(), pRes.json()]);
        setUsers(u);
        setProducts(p);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

   async function handleCreateProduct(e) {
   e.preventDefault();
   setError("");
   try {
     // validaciones mínimas
     if (!form.id || !form.name || form.price === "" || !form.userId) {
       return setError("id, name, price y userId son obligatorios");
     }
     const res = await fetch(`${PRODUCTS_API}/products`, {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
         id: String(form.id),
         name: form.name,
         price: Number(form.price),
         userId: form.userId,
       }),
     });
     if (!res.ok) {
       const t = await res.text();
       throw new Error(`POST /products ${res.status}: ${t}`);
     }
     // refrescar lista
     const listRes = await fetch(`${PRODUCTS_API}/products?userId=${encodeURIComponent(form.userId)}`);
     const list = await listRes.json();
     setProducts(list);
     // limpiar id y name/price para seguir creando
     setForm((f) => ({ ...f, id: "", name: "", price: "" }));
   } catch (e) {
     setError(String(e));
   }
 }


  if (loading) return <div style={{ padding: 16 }}>Cargando…</div>;
  if (error) return <div style={{ padding: 16, color: "red" }}>Error: {error}</div>;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h1>Dashboard</h1>

     <section>
       <h2>Create Product (POST /products)</h2>
       <form onSubmit={handleCreateProduct} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
         <input
           placeholder="id (string)"
           value={form.id}
           onChange={(e) => setForm({ ...form, id: e.target.value })}
         />
         <input
           placeholder="name"
           value={form.name}
           onChange={(e) => setForm({ ...form, name: e.target.value })}
         />
         <input
           placeholder="price"
           type="number"
           step="0.01"
           value={form.price}
           onChange={(e) => setForm({ ...form, price: e.target.value })}
         />
         <input
           placeholder="userId"
           value={form.userId}
           onChange={(e) => setForm({ ...form, userId: e.target.value })}
         />
         <button type="submit">Create</button>
       </form>
     </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Users (GET /users)</h2>
        <ul>
          {users.map((u) => (
            <li key={u.id || u.userId}>
              <pre>{JSON.stringify(u, null, 2)}</pre>
            </li>
          ))}
        </ul>
        {users.length === 0 && <em>Sin usuarios</em>}
      </section>

      <section>
        <h2>Products (GET /products)</h2>
        <ul>
          {products.map((p) => (
            <li key={p.id}>
              <pre>{JSON.stringify(p, null, 2)}</pre>
            </li>
          ))}
        </ul>
        {products.length === 0 && <em>Sin productos</em>}
      </section>
    </div>
  );
}

