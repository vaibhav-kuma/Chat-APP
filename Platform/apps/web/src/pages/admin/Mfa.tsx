import { useQuery } from "@tanstack/react-query";
import { api, apiPost } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";

interface MfaSetupResponse {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

export function AdminMfa() {
  const { refresh } = useAuth();
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const status = useQuery({
    queryKey: ["auth", "mfa-status"],
    queryFn: () => api<{ mfaEnabled: boolean; mfaVerified: boolean }>("/auth/mfa/status"),
  });

  const startSetup = async () => {
    setError("");
    setMessage("");
    try {
      const res = await apiPost<MfaSetupResponse>("/admin/mfa/setup", {});
      setSecret(res.secret);
      setQr(res.qrDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start MFA setup");
    }
  };

  const confirm = async () => {
    setError("");
    setMessage("");
    try {
      await apiPost("/admin/mfa/confirm", { secret, token });
      setMessage("MFA enabled successfully.");
      setSecret("");
      setQr("");
      setToken("");
      await refresh();
      await status.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code");
    }
  };

  const disable = async () => {
    setError("");
    setMessage("");
    if (!token) {
      setError("Enter your current 6-digit code to disable MFA.");
      return;
    }
    try {
      await apiPost("/admin/mfa/disable", { secret: "", token });
      setMessage("MFA disabled.");
      setToken("");
      await status.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code");
    }
  };

  const mfaEnabled = status.data?.mfaEnabled ?? false;

  return (
    <div style={{ maxWidth: 560 }}>
      <h3 className="section-title">Two-factor authentication</h3>
      <p className="muted" style={{ marginBottom: 16 }}>
        {mfaEnabled
          ? "MFA is enabled for your admin account."
          : "Admins must enable two-factor authentication to manage the platform. We recommend using Google Authenticator or a similar app."}
      </p>

      {mfaEnabled && !qr ? (
        <>
          <div style={{ marginTop: 16 }}>
            <div className="form-group">
              <label>Current 6-digit code</label>
              <input value={token} onChange={(e) => setToken(e.target.value)} maxLength={6} />
            </div>
            <button className="btn btn-danger" onClick={disable}>
              Confirm disable
            </button>
          </div>
        </>
      ) : !qr ? (
        <button className="btn btn-primary" onClick={startSetup}>
          Enable MFA
        </button>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <img src={qr} alt="QR code" style={{ border: "1px solid var(--border)", borderRadius: 8, width: 200, height: 200 }} />
            <p className="muted" style={{ fontSize: 13 }}>
              Scan with your authenticator app. Manual secret: <code>{secret}</code>
            </p>
          </div>
          <div className="form-group">
            <label>Verification code</label>
            <input value={token} onChange={(e) => setToken(e.target.value)} maxLength={6} />
          </div>
          <button className="btn btn-primary" onClick={confirm}>
            Verify & enable
          </button>
        </>
      )}

      {error && <div className="error-text">{error}</div>}
      {message && <div className="success-text">{message}</div>}
    </div>
  );
}
