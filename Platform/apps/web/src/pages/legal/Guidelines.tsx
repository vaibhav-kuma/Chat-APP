import { LegalLayout } from "./Terms";

export function Guidelines() {
  return (
    <LegalLayout title="Community Guidelines">
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      <p>Our Service is family-safe. These guidelines apply to all member activity including comments, chat, likes, and follows.</p>
      <section>
        <strong>1. Keep it family-safe</strong>
        <p>No adult content, violence, hate speech, harassment, or content that promotes harm to minors. Our moderation team reviews reports and takes action.</p>
      </section>
      <section>
        <strong>2. Respect others</strong>
        <p>Treat fellow members with respect. Harassment, doxxing, impersonation, and spam are prohibited.</p>
      </section>
      <section>
        <strong>3. No illegal content</strong>
        <p>Content that violates law, infringes intellectual property, or facilitates crime is prohibited. Copyright holders may file takedown requests per our Copyright page.</p>
      </section>
      <section>
        <strong>4. Reporting</strong>
        <p>You can report content via the report button. Reports are reviewed promptly, and action may include content removal, warning, or account suspension.</p>
      </section>
      <section>
        <strong>5. Enforcement</strong>
        <p>Repeated or severe violations result in suspension or termination of membership without refund, where permitted.</p>
      </section>
    </LegalLayout>
  );
}
