import { useState, useEffect, useCallback, createContext, useContext } from "react";

const BASE_URL = "/api";

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const parseJwt = (token) => {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
};
const getRole = (token) => {
  const p = parseJwt(token);
  return p?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || p?.role || p?.Role || "";
};
const getEmployeeId = (token) => {
  const p = parseJwt(token);
  return p?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || p?.sub || null;
};

const authFetch = (url, options = {}) => {
  const token = localStorage.getItem("token");
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).then((r) => r.json());
};

const PRIORITY_ENUM    = { 1: "Low", 2: "Medium", 3: "High" };
const STATUS_ENUM      = { 1: "Pending", 2: "InProgress", 3: "Completed" };
const STATUS_LABEL     = { 1: "Pending", 2: "In Progress", 3: "Completed" };
const PRIORITY_TO_NUM  = { Low: 1, Medium: 2, High: 3 };
const STATUS_TO_NUM    = { Pending: 1, InProgress: 2, Completed: 3 };

const normalizeTask = (t) => ({
  ...t,
  priority: typeof t.priority === "string" ? (PRIORITY_TO_NUM[t.priority] || 1) : t.priority,
  status:   typeof t.status   === "string" ? (STATUS_TO_NUM[t.status]     || 1) : t.status,
});

const api = {
  login:    (dto) => authFetch(`${BASE_URL}/Auth/login`,    { method: "POST", body: JSON.stringify(dto) }),
  register: (dto) => authFetch(`${BASE_URL}/Auth/register`, { method: "POST", body: JSON.stringify(dto) }),
  getAllTasks:      () => authFetch(`${BASE_URL}/TaskItem/getAll?getAll=true`),
  getMyTasks:      () => authFetch(`${BASE_URL}/TaskItem/my-tasks`),
  createTask:      (form) => authFetch(`${BASE_URL}/TaskItem`, { method: "POST", body: JSON.stringify({ title: form.title, description: form.description, priority: PRIORITY_ENUM[form.priority], status: STATUS_ENUM[form.status], dueDate: form.dueDate, employeeId: form.employeeId }) }),
  updateTask:      (id, form) => authFetch(`${BASE_URL}/TaskItem/${id}`, { method: "PUT", body: JSON.stringify({ title: form.title, description: form.description, priority: PRIORITY_ENUM[form.priority], status: STATUS_ENUM[form.status], dueDate: form.dueDate }) }),
  updateTaskStatus:(id, task, newStatus) => authFetch(`${BASE_URL}/TaskItem/${id}`, { method: "PUT", body: JSON.stringify({ title: task.title, description: task.description, priority: PRIORITY_ENUM[task.priority], status: STATUS_ENUM[newStatus], dueDate: task.dueDate }) }),
  deleteTask:      (id) => authFetch(`${BASE_URL}/TaskItem/${id}`, { method: "DELETE" }),
  getAllEmployees:  () => authFetch(`${BASE_URL}/Employee/getAll?getAll=true`),
};

const PRIORITY_COLOR = {
  1: { bg: "#1a2a1a", text: "#4ade80", border: "#166534" },
  2: { bg: "#2a2200", text: "#fbbf24", border: "#92400e" },
  3: { bg: "#2a0a0a", text: "#f87171", border: "#991b1b" },
};
const STATUS_COLOR = {
  1: { bg: "#1e1e2e", text: "#a78bfa", border: "#4c1d95" },
  2: { bg: "#0f2027", text: "#38bdf8", border: "#0369a1" },
  3: { bg: "#0a1f0a", text: "#34d399", border: "#065f46" },
};

const formatDate = (d) => { try { return new Date(d).toLocaleDateString("en-GB"); } catch { return d || "—"; } };

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Syne', sans-serif; background: #080810; color: #e2e8f0; min-height: 100vh; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0f0f1a; }
  ::-webkit-scrollbar-thumb { background: #2d2d4e; border-radius: 3px; }

  .auth-bg { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #080810; background-image: radial-gradient(ellipse at 30% 30%, rgba(99,102,241,0.12) 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, rgba(168,85,247,0.08) 0%, transparent 55%); padding: 20px; }
  .auth-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(99,102,241,0.2); border-radius: 24px; padding: 40px; width: 100%; max-width: 420px; box-shadow: 0 30px 80px rgba(0,0,0,0.5); animation: slideUp 0.3s ease; }
  .auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; justify-content: center; }
  .auth-logo-icon { width: 42px; height: 42px; background: linear-gradient(135deg,#6366f1,#a855f7); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
  .auth-logo-text { font-size: 26px; font-weight: 800; }
  .auth-logo-text span { color: #6366f1; }
  .auth-title { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
  .auth-sub { font-size: 13px; color: #475569; margin-bottom: 28px; }
  .auth-switch { text-align: center; margin-top: 20px; font-size: 13px; color: #475569; }
  .auth-switch button { background: none; border: none; color: #818cf8; cursor: pointer; font-weight: 600; font-family: 'Syne', sans-serif; font-size: 13px; }
  .auth-switch button:hover { color: #a5b4fc; }
  .role-toggle { display: flex; gap: 10px; margin-bottom: 4px; }
  .role-btn { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #64748b; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .role-btn.active { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.1); color: #a5b4fc; }
  .success-banner { background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.25); border-radius: 10px; padding: 11px 14px; color: #34d399; font-size: 13px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }

  .app { min-height: 100vh; background: #080810; background-image: radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(168,85,247,0.05) 0%, transparent 50%); }
  .header { padding: 16px 40px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 100; }
  .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px; }
  .logo-icon { width: 34px; height: 34px; background: linear-gradient(135deg,#6366f1,#a855f7); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
  .logo span { color: #6366f1; }
  .header-right { display: flex; align-items: center; gap: 12px; }
  .user-pill { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 100px; padding: 6px 14px; font-size: 13px; color: #94a3b8; }
  .user-avatar { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg,#6366f1,#a855f7); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; }
  .role-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 100px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; }
  .role-badge.admin { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
  .role-badge.employee { background: rgba(99,102,241,0.1); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); }
  .stats-pill { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); border-radius: 100px; padding: 6px 14px; font-size: 12px; color: #a5b4fc; font-family: 'JetBrains Mono', monospace; }
  .btn-primary { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: white; border: none; border-radius: 10px; padding: 9px 18px; font-size: 13px; font-weight: 600; font-family: 'Syne', sans-serif; cursor: pointer; display: flex; align-items: center; gap: 7px; transition: all 0.2s; box-shadow: 0 4px 15px rgba(99,102,241,0.3); }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-logout { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #f87171; border-radius: 9px; padding: 7px 14px; font-size: 12px; font-weight: 600; font-family: 'Syne', sans-serif; cursor: pointer; transition: all 0.2s; }
  .btn-logout:hover { background: rgba(239,68,68,0.15); }
  .tabs { display: flex; gap: 4px; padding: 20px 40px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .tab { border: none; background: transparent; color: #475569; padding: 10px 20px; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s; }
  .tab.active { color: #818cf8; border-bottom-color: #6366f1; }
  .tab:hover:not(.active) { color: #94a3b8; }
  .main { padding: 28px 40px; }
  .filters { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
  .search-box { flex: 1; min-width: 200px; max-width: 300px; position: relative; }
  .search-box input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 9px 14px 9px 38px; color: #e2e8f0; font-size: 13px; font-family: 'Syne', sans-serif; outline: none; transition: border-color 0.2s; }
  .search-box input:focus { border-color: rgba(99,102,241,0.5); }
  .search-box input::placeholder { color: #4a5568; }
  .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #4a5568; font-size: 13px; }
  .filter-select { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 9px 14px; color: #e2e8f0; font-size: 13px; font-family: 'Syne', sans-serif; outline: none; cursor: pointer; }
  .filter-select option { background: #1a1a2e; }
  .view-toggle { display: flex; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; }
  .view-btn { border: none; background: transparent; color: #475569; padding: 8px 13px; cursor: pointer; font-size: 14px; transition: all 0.15s; }
  .view-btn.active { background: rgba(99,102,241,0.2); color: #a5b4fc; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 18px; }
  .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 13px; transition: all 0.25s; animation: fadeUp 0.4s ease both; position: relative; overflow: hidden; }
  .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,#6366f1,#a855f7); opacity: 0; transition: opacity 0.2s; }
  .card:hover { border-color: rgba(99,102,241,0.25); transform: translateY(-2px); background: rgba(255,255,255,0.05); }
  .card:hover::before { opacity: 1; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .card-title { font-size: 15px; font-weight: 700; color: #f1f5f9; line-height: 1.3; flex: 1; }
  .card-actions { display: flex; gap: 5px; opacity: 0; transition: opacity 0.2s; }
  .card:hover .card-actions, .list-card:hover .card-actions { opacity: 1; }
  .icon-btn { width: 28px; height: 28px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: all 0.15s; }
  .icon-btn:hover.edit { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.4); color: #a5b4fc; }
  .icon-btn:hover.del  { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #f87171; }
  .card-desc { font-size: 12px; color: #64748b; line-height: 1.6; }
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 6px; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; border: 1px solid; font-family: 'JetBrains Mono', monospace; }
  .card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); }
  .due-date { font-size: 11px; color: #475569; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 5px; }
  .emp-badge { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg,#6366f1,#a855f7); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: white; flex-shrink: 0; }
  .status-select { background: transparent; border: none; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; cursor: pointer; outline: none; padding: 0; appearance: none; -webkit-appearance: none; }
  .list-view { display: flex; flex-direction: column; gap: 9px; }
  .list-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; transition: all 0.2s; animation: fadeUp 0.3s ease both; }
  .list-card:hover { border-color: rgba(99,102,241,0.25); background: rgba(255,255,255,0.05); }
  .list-card .card-actions { opacity: 0; }
  .table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid rgba(255,255,255,0.07); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead { background: rgba(255,255,255,0.03); }
  th { padding: 14px 18px; text-align: left; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  td { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #cbd5e1; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.02); }
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.15s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal { background: #0f0f1e; border: 1px solid rgba(99,102,241,0.2); border-radius: 20px; padding: 30px; width: 100%; max-width: 480px; animation: slideUp 0.25s ease; box-shadow: 0 25px 60px rgba(0,0,0,0.6); }
  .modal-title { font-size: 18px; font-weight: 800; margin-bottom: 22px; }
  .form-group { margin-bottom: 14px; }
  .form-label { display: block; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .form-input, .form-select, .form-textarea { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 13px; color: #e2e8f0; font-size: 13px; font-family: 'Syne', sans-serif; outline: none; transition: border-color 0.2s; }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.04); }
  .form-textarea { resize: vertical; min-height: 75px; }
  .form-select option { background: #1a1a2e; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .modal-actions { display: flex; gap: 10px; margin-top: 22px; justify-content: flex-end; }
  .btn-secondary { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; border-radius: 10px; padding: 9px 18px; font-size: 13px; font-weight: 600; font-family: 'Syne', sans-serif; cursor: pointer; transition: all 0.2s; }
  .btn-secondary:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
  .btn-danger { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #f87171; border-radius: 10px; padding: 9px 18px; font-size: 13px; font-weight: 600; font-family: 'Syne', sans-serif; cursor: pointer; transition: all 0.2s; }
  .btn-danger:hover { background: rgba(239,68,68,0.22); }
  .loading { display: flex; align-items: center; justify-content: center; padding: 80px; color: #334155; font-size: 14px; gap: 12px; }
  .spinner { width: 20px; height: 20px; border: 2px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty-state { text-align: center; padding: 70px 20px; color: #334155; }
  .empty-state .icon { font-size: 44px; margin-bottom: 14px; }
  .error-banner { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 12px; padding: 12px 18px; color: #f87171; font-size: 13px; margin-bottom: 18px; display: flex; align-items: center; gap: 10px; }
  .toast { position: fixed; bottom: 28px; right: 28px; background: #0f0f1e; border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 13px 18px; font-size: 13px; color: #a5b4fc; z-index: 300; animation: toastIn 0.3s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
  @keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .action-btn { border: none; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; font-family: 'Syne', sans-serif; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
  .action-btn.start  { background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8; }
  .action-btn.start:hover  { background: rgba(56,189,248,0.22); transform: translateY(-1px); }
  .action-btn.finish { background: rgba(52,211,153,0.12); border: 1px solid rgba(52,211,153,0.3); color: #34d399; }
  .action-btn.finish:hover { background: rgba(52,211,153,0.22); transform: translateY(-1px); }
  .done-tag { font-size: 12px; font-weight: 700; color: #34d399; display: inline-flex; align-items: center; gap: 5px; opacity: 0.8; }
  .field-error { font-size: 11px; color: #f87171; margin-top: 5px; }
`;

// ─── Auth Provider ────────────────────────────────────────────────────────────
function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser]   = useState(() => {
    const t = localStorage.getItem("token");
    if (!t) return null;
    const p = parseJwt(t);
    return { role: getRole(t), employeeId: getEmployeeId(t), name: p?.name || p?.Name || "User" };
  });
  const login = (tok) => {
    localStorage.setItem("token", tok);
    setToken(tok);
    const p = parseJwt(tok);
    setUser({ role: getRole(tok), employeeId: getEmployeeId(tok), name: p?.name || p?.Name || "User" });
  };
  const logout = () => { localStorage.removeItem("token"); setToken(null); setUser(null); };
  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAdmin: user?.role?.toLowerCase() === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function App() {
  return <AuthProvider><style>{styles}</style><Router /></AuthProvider>;
}

function Router() {
  const { token } = useAuth();
  return token ? <Dashboard /> : <AuthPage />;
}

// ─── Auth Page ────────────────────────────────────────────────────────────────
function AuthPage() {
  const [mode, setMode]       = useState("login");
  const [form, setForm]       = useState({ name: "", email: "", password: "", role: "Employee", department: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const { login }             = useAuth();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const switchMode = (targetMode) => {
    setMode(targetMode || (m => m === "login" ? "register" : "login"));
    setError("");
    setSuccess("");
    setForm({ name: "", email: "", password: "", role: "Employee", department: "" });
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    // Frontend validation
    if (!form.email || !form.password) { setError("Email and password are required"); return; }
    if (mode === "register" && !form.name.trim()) { setError("Name is required"); return; }
    if (mode === "register" && !form.department.trim()) { setError("Department is required"); return; }

    setLoading(true);
    try {
      if (mode === "register") {
        // ── Register ──
        const payload = { name: form.name, email: form.email, password: form.password, role: form.role, department: form.department };
        const res = await api.register(payload);

        // Register ناجح لو راجع id أو success
        if (res?.id || res?.success) {
          setSuccess("✅ Account created! Please sign in.");
          setTimeout(() => switchMode("login"), 1500);
        } else if (res?.data && typeof res.data === "object") {
          const msgs = Object.values(res.data).flat().join(", ");
          setError(msgs || res.message || "Registration failed");
        } else {
          setError(res?.message || "Registration failed");
        }
      } else {
        // ── Login ──
        const payload = { email: form.email, password: form.password };
        const res = await api.login(payload);

            if (res?.token) {
              login(res.token);
            } else if (res?.data?.token) {
              login(res.data.token);
            } else {
              setError(res?.message || "Invalid credentials");
            }
      }
    } catch { setError("Cannot connect to server"); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">✓</div>
          <div className="auth-logo-text">Task<span>Flow</span></div>
        </div>
        <div className="auth-title">{mode === "login" ? "Welcome back 👋" : "Create account"}</div>
        <div className="auth-sub">{mode === "login" ? "Sign in to your workspace" : "Join your team workspace"}</div>

        {mode === "register" && (
          <>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="Your name" value={form.name} onChange={set("name")} />
            </div>

            <div className="form-group">
              <label className="form-label">Department *</label>
              <input className="form-input" placeholder="e.g. IT, HR, Finance..." value={form.department} onChange={set("department")} />
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>
        <div className="form-group">
          <label className="form-label">Password *</label>
          <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>

        {error   && <div className="field-error"    style={{ marginBottom: 12 }}>⚠️ {error}</div>}
        {success && <div className="success-banner" style={{ marginBottom: 12 }}>{success}</div>}

        <button className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px" }}
          onClick={handleSubmit} disabled={loading}>
          {loading
            ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Loading...</>
            : mode === "login" ? "Sign In →" : "Create Account →"}
        </button>

        <div className="auth-switch">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => switchMode()}>{mode === "login" ? "Register" : "Sign In"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const [tab, setTab]     = useState("tasks");
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  return (
    <div className="app">
      <header className="header">
        <div className="logo"><div className="logo-icon">✓</div>Task<span>Flow</span></div>
        <div className="header-right">
          <div className="user-pill">
            <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <span>{user?.name}</span>
            <span className={`role-badge ${isAdmin ? "admin" : "employee"}`}>{isAdmin ? "Admin" : "Employee"}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign out</button>
        </div>
      </header>

      {isAdmin && (
        <div className="tabs">
          <button className={`tab ${tab === "tasks"     ? "active" : ""}`} onClick={() => setTab("tasks")}>Tasks</button>
          <button className={`tab ${tab === "employees" ? "active" : ""}`} onClick={() => setTab("employees")}>Employees</button>
        </div>
      )}

      {tab === "tasks"     && <TasksView showToast={showToast} />}
      {tab === "employees" && <EmployeesView />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ─── Tasks View ───────────────────────────────────────────────────────────────
function TasksView({ showToast }) {
  const { isAdmin } = useAuth();
  const [tasks, setTasks]         = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState({ title: "", description: "", priority: 1, status: 1, dueDate: new Date().toISOString(), employeeId: 1 });
  const [editId, setEditId]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus]     = useState("0");
  const [filterPriority, setFilterPriority] = useState("0");
  const [view, setView] = useState("grid");

  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const res = isAdmin ? await api.getAllTasks() : await api.getMyTasks();
      if (res.success) {
        const data = Array.isArray(res.data) ? res.data : [res.data].filter(Boolean);
        setTasks(data.map(normalizeTask));
      } else setError(res.message || "Failed to load tasks");
    } catch { setError("Cannot connect to API"); }
  }, [isAdmin]);

  useEffect(() => {
    const init = async () => {
      await loadTasks();
      if (isAdmin) { try { const r = await api.getAllEmployees(); if (r.success) setEmployees(r.data || []); } catch {} }
      setLoading(false);
    };
    init();
  }, [loadTasks, isAdmin]);

  const openCreate = () => { setForm({ title: "", description: "", priority: 1, status: 1, dueDate: new Date().toISOString(), employeeId: employees[0]?.id || 1 }); setEditId(null); setModal("create"); };
  const openEdit   = (t) => { setForm({ title: t.title, description: t.description, priority: t.priority, status: t.status, dueDate: t.dueDate || new Date().toISOString(), employeeId: t.employeeId }); setEditId(t.id); setModal("edit"); };
  const openDelete = (t) => { setDeleteTarget(t); setModal("delete"); };
  const closeModal = ()  => { setModal(null); setDeleteTarget(null); };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = modal === "create" ? await api.createTask(form) : await api.updateTask(editId, form);
      if (res.success) { await loadTasks(); showToast(modal === "create" ? "✅ Task created!" : "✏️ Task updated!"); closeModal(); }
      else showToast("❌ " + (res.message || "Error"));
    } catch { showToast("❌ Network error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await api.deleteTask(deleteTarget.id); await loadTasks(); showToast("🗑️ Task deleted"); closeModal(); }
    catch { showToast("❌ Network error"); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const res = await api.updateTaskStatus(task.id, task, newStatus);
      if (res.success) { await loadTasks(); showToast("✅ Status updated!"); }
      else showToast("❌ " + (res.message || "Error"));
    } catch { showToast("❌ Network error"); }
  };

  const filtered = tasks.filter((t) => {
    const q = search.toLowerCase();
    return (
      (t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) &&
      (filterStatus   === "0" || t.status   === +filterStatus) &&
      (filterPriority === "0" || t.priority === +filterPriority)
    );
  });

  const stats = { total: tasks.length, active: tasks.filter(t => t.status === 2).length, done: tasks.filter(t => t.status === 3).length };
  const empInitial = (id) => { const e = employees.find(e => e.id === id); return e ? e.name?.charAt(0).toUpperCase() : `E${id}`; };

  return (
    <main className="main">
      {error && <div className="error-banner">⚠️ {error} <button className="btn-secondary" style={{ marginLeft: "auto", padding: "3px 10px", fontSize: 11 }} onClick={() => { setLoading(true); loadTasks().finally(() => setLoading(false)); }}>Retry</button></div>}

      <div className="filters">
        <div className="search-box"><span className="search-icon">⌕</span><input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="0">All Status</option><option value="1">Pending</option><option value="2">In Progress</option><option value="3">Completed</option>
        </select>
        <select className="filter-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="0">All Priority</option><option value="1">Low</option><option value="2">Medium</option><option value="3">High</option>
        </select>
        <div className="stats-pill">{stats.done}/{stats.total} Done · {stats.active} Active</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <div className="view-toggle">
            <button className={`view-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")}>⊞</button>
            <button className={`view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>☰</button>
          </div>
          {isAdmin && <button className="btn-primary" onClick={openCreate}>+ New Task</button>}
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading tasks...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">📭</div><p>{tasks.length === 0 ? "No tasks yet" : "No tasks match filters"}</p></div>
      ) : view === "grid" ? (
        <div className="grid">
          {filtered.map((t, i) => (
            <TaskCard key={t.id} task={t} index={i} empInitial={empInitial(t.employeeId)}
              isAdmin={isAdmin} onEdit={openEdit} onDelete={openDelete} onStatusChange={handleStatusChange} />
          ))}
        </div>
      ) : (
        <div className="list-view">
          {filtered.map((t, i) => (
            <TaskListItem key={t.id} task={t} index={i} empInitial={empInitial(t.employeeId)}
              isAdmin={isAdmin} onEdit={openEdit} onDelete={openDelete} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {(modal === "create" || modal === "edit") && (
        <div className="overlay" onClick={(e) => e.target.className === "overlay" && closeModal()}>
          <div className="modal">
            <div className="modal-title">{modal === "create" ? "✦ New Task" : "✎ Edit Task"}</div>
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" placeholder="Task title..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" placeholder="Task description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: +e.target.value })}>
                  <option value={1}>Low</option><option value={2}>Medium</option><option value={3}>High</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: +e.target.value })}>
                  <option value={1}>Pending</option><option value={2}>In Progress</option><option value={3}>Completed</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.dueDate?.split("T")[0] || ""} onChange={(e) => setForm({ ...form, dueDate: new Date(e.target.value).toISOString() })} />
              </div>
              <div className="form-group"><label className="form-label">Employee</label>
                {employees.length > 0
                  ? <select className="form-select" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: +e.target.value })}>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select>
                  : <input className="form-input" type="number" min={1} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: +e.target.value })} />
                }
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving || !form.title.trim()}>{saving ? "Saving..." : modal === "create" ? "Create Task" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {modal === "delete" && deleteTarget && (
        <div className="overlay" onClick={(e) => e.target.className === "overlay" && closeModal()}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-title">🗑️ Delete Task</div>
            <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>Delete <strong style={{ color: "#f1f5f9" }}>"{deleteTarget.title}"</strong>? This cannot be undone.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete} disabled={saving}>{saving ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Employees View ───────────────────────────────────────────────────────────
function EmployeesView() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    api.getAllEmployees().then(res => { if (res.success) setEmployees(res.data || []); }).finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="main">
      <div className="filters">
        <div className="search-box"><span className="search-icon">⌕</span><input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="stats-pill">{employees.length} Employees</div>
      </div>
      {loading ? <div className="loading"><div className="spinner" /> Loading...</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Department</th></tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ color: "#475569", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>{e.id}</td>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="emp-badge" style={{ width: 30, height: 30, fontSize: 12 }}>{e.name?.charAt(0).toUpperCase()}</div><span style={{ fontWeight: 600, color: "#f1f5f9" }}>{e.name}</span></div></td>
                  <td style={{ color: "#64748b" }}>{e.email}</td>
                  <td><span className="badge" style={{ background: "rgba(99,102,241,0.08)", color: "#818cf8", borderColor: "rgba(99,102,241,0.2)" }}>{e.department || "—"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, index, empInitial, isAdmin, onEdit, onDelete, onStatusChange }) {
  const pc = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR[1];
  const sc = STATUS_COLOR[task.status]     || STATUS_COLOR[1];
  return (
    <div className="card" style={{ animationDelay: `${index * 0.04}s` }}>
      <div className="card-header">
        <div className="card-title">{task.title}</div>
        {isAdmin && <div className="card-actions"><button className="icon-btn edit" onClick={() => onEdit(task)}>✎</button><button className="icon-btn del" onClick={() => onDelete(task)}>✕</button></div>}
      </div>
      <p className="card-desc">{task.description}</p>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
        <span className="badge" style={{ background: pc.bg, color: pc.text, borderColor: pc.border }}>● {PRIORITY_ENUM[task.priority]}</span>
        <span className="badge" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>{STATUS_LABEL[task.status]}</span>
      </div>

      {/* Employee Action Buttons */}
      {!isAdmin && (
        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          {task.status === 1 && (
            <button className="action-btn start" onClick={() => onStatusChange(task, 2)}>
              🚀 Start Task
            </button>
          )}
          {task.status === 2 && (
            <button className="action-btn finish" onClick={() => onStatusChange(task, 3)}>
              ✅ Mark Complete
            </button>
          )}
          {task.status === 3 && (
            <div className="done-tag">🎉 Completed</div>
          )}
        </div>
      )}

      <div className="card-footer">
        <div className="due-date">📅 {formatDate(task.dueDate)}</div>
        <div className="emp-badge" title={`Employee #${task.employeeId}`}>{empInitial}</div>
      </div>
    </div>
  );
}

function TaskListItem({ task, index, empInitial, isAdmin, onEdit, onDelete, onStatusChange }) {
  const pc = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR[1];
  const sc = STATUS_COLOR[task.status]     || STATUS_COLOR[1];
  return (
    <div className="list-card" style={{ animationDelay: `${index * 0.03}s` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{task.title}</div>
        <div style={{ fontSize: 11, color: "#475569" }}>{task.description}</div>
      </div>
      <span className="badge" style={{ background: pc.bg, color: pc.text, borderColor: pc.border }}>{PRIORITY_ENUM[task.priority]}</span>
      <span className="badge" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>{STATUS_LABEL[task.status]}</span>

      {!isAdmin && (
        <>
          {task.status === 1 && <button className="action-btn start" onClick={() => onStatusChange(task, 2)}>🚀 Start</button>}
          {task.status === 2 && <button className="action-btn finish" onClick={() => onStatusChange(task, 3)}>✅ Finish</button>}
          {task.status === 3 && <div className="done-tag">🎉 Done</div>}
        </>
      )}

      <div className="due-date">📅 {formatDate(task.dueDate)}</div>
      <div className="emp-badge">{empInitial}</div>
      {isAdmin && <div className="card-actions"><button className="icon-btn edit" onClick={() => onEdit(task)}>✎</button><button className="icon-btn del" onClick={() => onDelete(task)}>✕</button></div>}
    </div>
  );
}