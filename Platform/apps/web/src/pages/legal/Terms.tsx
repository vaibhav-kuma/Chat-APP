export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <h2 className="section-title">{title}</h2>
      <div style={{ color: "var(--text-dim)", fontSize: 15, lineHeight: 1.7, display: "grid", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

export function Terms() {
  return (
    <LegalLayout title="Terms of Service">
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      <p>These Terms of Service ("Terms") govern your access to and use of the Platform's subscription video and live-streaming service ("Service"). By creating an account you agree to these Terms.</p>
      <section>
        <strong>1. Membership</strong>
        <p>Membership is billed in advance, typically on a monthly cycle. Prices are displayed at checkout. You may cancel at any time; access continues until the end of the paid period.</p>
      </section>
      <section>
        <strong>2. Acceptable use</strong>
        <p>The Service is family-safe. You may not upload, transmit, or facilitate content that is unlawful, infringing, harmful, or that violates our Community Guidelines. Violations may result in account termination.</p>
      </section>
      <section>
        <strong>3. Payments & refunds</strong>
        <p>Payments are processed through our payment partner. Refund requests are handled in accordance with applicable law and our refund policy. Charge failures may result in a grace period followed by suspension of access.</p>
      </section>
      <section>
        <strong>4. Content ownership</strong>
        <p>All videos and live streams are licensed to you for personal, non-commercial use while your membership is active. You may not re-distribute or re-stream content.</p>
      </section>
      <section>
        <strong>5. Termination</strong>
        <p>We may suspend or terminate access for violation of these Terms or applicable law. Members may cancel their membership at any time.</p>
      </section>
      <section>
        <strong>6. Limitation of liability</strong>
        <p>The Service is provided "as is" and "as available". To the maximum extent permitted by law, we disclaim liability for indirect, incidental, or consequential damages.</p>
      </section>
      <section>
        <strong>7. Grievance Officer</strong>
        <p>In accordance with applicable Indian law, any complaints regarding content may be directed to our Grievance Officer (contact details to be published here) and will be acknowledged within 24 hours.</p>
      </section>
      <section>
        <strong>8. Contact</strong>
        <p>Questions about these Terms: contact support.</p>
      </section>
    </LegalLayout>
  );
}
