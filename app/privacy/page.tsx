export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: July 3, 2026</p>
        </div>

        <div className="mt-12 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>
              We collect information you provide when creating an account, including your name,
              email address, and profile information. We also collect data about your content
              scheduling preferences, connected social media accounts, and usage patterns.
            </p>
            <p className="mt-2">
              When you connect a social media account, we store authentication tokens and basic
              profile information necessary to facilitate publishing on your behalf. We never store
              your social media passwords.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Provide, maintain, and improve our content scheduling and publishing services</li>
              <li>Authenticate your identity and authorize connected social media accounts</li>
              <li>Generate and schedule content based on your preferences</li>
              <li>Send service-related communications and updates</li>
              <li>Detect and prevent abuse, fraud, or unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">3. Data Sharing</h2>
            <p>
              We do not sell your personal information. We may share data with third-party service
              providers who help us operate our platform (e.g., cloud hosting, AI model providers)
              under strict data processing agreements. Social media platforms receive only the
              content and metadata necessary for publishing.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">4. Data Retention</h2>
            <p>
              We retain your account information for as long as your account is active. Upon account
              deletion, we delete or anonymize your personal data within 30 days, except where
              legal obligations require extended retention.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">5. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have the right to access, correct, delete, or
              port your personal data. You may also withdraw consent for data processing at any
              time by contacting us or adjusting your account settings.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">6. Security</h2>
            <p>
              We implement industry-standard security measures including encryption at rest and in
              transit, regular security audits, and access controls to protect your data. However,
              no method of electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">7. Contact</h2>
            <p>
              For privacy-related inquiries, contact us at{' '}
              <span className="text-foreground">privacy@autopostagent.com</span> or visit our{' '}
              <a href="/contact" className="text-foreground underline underline-offset-2">
                Contact page
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">8. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be communicated
              via email or through the platform. Continued use after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
