import { useQuery } from "@tanstack/react-query";
import { api, apiPost } from "../api/client";
import type { Plan, SubscriptionStatusResponse } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export function Subscription() {
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => api<{ plans: Plan[] }>("/subscriptions/plans"),
  });

  const status = useQuery({
    queryKey: ["subscription", "status"],
    queryFn: () => api<SubscriptionStatusResponse>("/subscriptions/status"),
  });

  const subscribe = async (planId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await apiPost<{ orderId: string; amountPaise: number; currency: string; keyId: string }>(
        "/subscriptions/checkout",
        { planId }
      );
      setMessage({
        kind: "success",
        text: `Order ${res.orderId} created for ${(res.amountPaise / 100).toFixed(2)} ${res.currency}. (Razorpay checkout opens in a real deployment.)`,
      });
      await refresh();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Checkout failed" });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await apiPost("/subscriptions/cancel");
      setMessage({ kind: "success", text: "Subscription will not renew at the end of the current period." });
      await refresh();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Cancel failed" });
    } finally {
      setBusy(false);
    }
  };

  const sub = status.data?.subscription;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2 className="section-title">Membership</h2>

      {sub ? (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <strong style={{ fontSize: 18 }}>{sub.plan.name}</strong>
              <div className="muted">
                Status: <span style={{ textTransform: "uppercase", color: "var(--accent)" }}>{sub.status}</span>
              </div>
              {sub.currentPeriodEnd && (
                <div className="muted">Renews / ends on {new Date(sub.currentPeriodEnd).toLocaleDateString()}</div>
              )}
              {sub.gracePeriodEnd && <div className="muted">Grace period until {new Date(sub.gracePeriodEnd).toLocaleDateString()}</div>}
              {sub.cancelAtPeriodEnd && <div className="muted">Auto-renewal cancelled</div>}
            </div>
            {sub.status === "ACTIVE" && !sub.cancelAtPeriodEnd && (
              <button className="btn" onClick={cancel} disabled={busy}>
                Cancel membership
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="muted" style={{ marginBottom: 24 }}>
          You don't have an active membership. Choose a plan below.
        </p>
      )}

      {message && (
        <div className={message.kind === "error" ? "error-text" : "success-text"} style={{ marginBottom: 16 }}>
          {message.text}
        </div>
      )}

      {plans.data && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {plans.data.plans.map((plan) => (
            <div key={plan.id} className="card" style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 8px" }}>{plan.name}</h3>
              <div style={{ fontSize: 28, fontWeight: 800 }}>
                ₹{(plan.pricePaise / 100).toFixed(2)}
                <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>
                  {" "}
                  / {plan.billingCycle}
                </span>
              </div>
              {plan.trialDays > 0 && <div className="muted" style={{ margin: "4px 0 12px" }}>{plan.trialDays}-day trial</div>}
              <button className="btn btn-primary btn-block" disabled={busy} onClick={() => subscribe(plan.id)}>
                Subscribe
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
