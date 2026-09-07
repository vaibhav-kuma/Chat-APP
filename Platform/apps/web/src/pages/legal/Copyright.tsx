import { LegalLayout } from "./Terms";

export function Copyright() {
  return (
    <LegalLayout title="Copyright & Takedown">
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      <p>We respect intellectual property rights and comply with applicable copyright law, including the Indian Copyright Act, 1957.</p>
      <section>
        <strong>Notice to copyright holders</strong>
        <p>If you believe content on our Service infringes your copyright, submit a written notice to our designated agent including: your contact details, identification of the copyrighted work, identification of the infringing material (with URLs), a statement of good-faith belief of infringement, and a declaration of accuracy under penalty of perjury.</p>
      </section>
      <section>
        <strong>Counter-notices</strong>
        <p>If your content was removed in error, you may file a counter-notice explaining why the content does not infringe. We will review in accordance with applicable law.</p>
      </section>
      <section>
        <strong>Repeat infringers</strong>
        <p>We may terminate accounts of repeat infringers in appropriate circumstances.</p>
      </section>
      <section>
        <strong>Contact</strong>
        <p>Send copyright notices to our designated agent (contact details to be published here).</p>
      </section>
    </LegalLayout>
  );
}
