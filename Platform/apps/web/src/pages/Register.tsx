import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(email, password, name);
      navigate("/subscribe");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1 style={{ margin: "0 0 24px", fontSize: 22 }}>Create your account</h1>
      <div className="form-group">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <div className="error-text">{error}</div>}
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create account"}
      </button>
      <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
        Already a member? <Link to="/login" style={{ color: "var(--accent)" }}>Login</Link>
      </p>
    </form>
  );
}
