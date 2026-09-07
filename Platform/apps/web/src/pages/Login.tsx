import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await login(email, password);
      navigate(res.mfaRequired ? "/admin/mfa" : "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1 style={{ margin: "0 0 24px", fontSize: 22 }}>Welcome back</h1>
      <div className="form-group">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <div className="error-text">{error}</div>}
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        {busy ? "Logging in…" : "Login"}
      </button>
      <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
        New here? <Link to="/register" style={{ color: "var(--accent)" }}>Create an account</Link>
      </p>
    </form>
  );
}
