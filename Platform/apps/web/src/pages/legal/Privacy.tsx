import { LegalLayout } from "./Terms";

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      <p>This Privacy Policy explains how we collect, use, and protect your personal data when you use our Service, including our compliance with the Digital Personal Data Protection Act (DPDP), 2023 of India.</p>
      <section>
        <strong>1. Data we collect</strong>
        <p>Account details (name, email), payment references (via our payment partner; we do not store full card data), device and usage information (views, likes, comments), and support communications.</p>
      </section>
      <section>
        <strong>2. How we use data</strong>
        <p>To provide and improve the Service, process payments, send service and promotional notifications (with opt-out), enforce our Terms, and comply with legal obligations.</p>
      </section>
      <section>
        <strong>3. Consent</strong>
        <p>We process personal data based on your consent and on lawful bases. You may withdraw consent where applicable, subject to contractual and legal requirements.</p>
      </section>
      <section>
        <strong>4. Sharing</strong>
        <p>We share data only with trusted processors (hosting, video delivery, payments) under contractual safeguards, and when required by law.</p>
      </section>
      <section>
        <strong>5. Data retention & security</strong>
        <p>We retain data only as long as necessary and apply industry-standard technical and organizational measures to protect it. You may request deletion of your account data.</p>
      </section>
      <section>
        <strong>6. Your rights</strong>
        <p>You have rights to access, correct, update, and request erasure of your personal data, and to lodge a complaint with the relevant authority under DPDP.</p>
      </section>
      <section>
        <strong>7. Contact</strong>
        <p>For privacy requests: contact our Data Protection Officer / Grievance Officer.</p>
      </section>
    </LegalLayout>
  );
}
