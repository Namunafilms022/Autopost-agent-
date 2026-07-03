export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: July 3, 2026</p>
        </div>

        <div className="mt-12 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using AutoPost Agent (&ldquo;the Service&rdquo;), you agree to be
              bound by these Terms of Service. If you do not agree, you may not use the Service.
              The Service is owned and operated by Brandica and engineered by EchoSage.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p>
              AutoPost Agent provides AI-powered content generation, scheduling, and multi-platform
              publishing tools. The Service allows users to connect social media accounts, create
              and schedule content, and publish across supported platforms through a unified
              dashboard.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account. You must provide accurate,
              current, and complete information during registration.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
              <li>Post or publish content that infringes on third-party intellectual property rights</li>
              <li>Distribute malware, spam, or harmful code through the Service</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use the Service to harass, abuse, or harm others</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">5. Intellectual Property</h2>
            <p>
              The Service, including its code, design, and branding, is owned by Brandica. You
              retain ownership of the content you create and publish through the Service. By using
              the Service, you grant us a limited license to process and store your content solely
              for the purpose of providing the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">6. Third-Party Services</h2>
            <p>
              The Service integrates with third-party platforms (e.g., LinkedIn, X, TikTok). Your
              use of those platforms is subject to their respective terms of service. We are not
              responsible for the actions or policies of third-party platforms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Brandica and EchoSage shall not be liable for
              any indirect, incidental, special, or consequential damages arising from your use of
              the Service. The Service is provided &ldquo;as is&rdquo; without warranty of any kind.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms or
              engage in abusive behavior. You may terminate your account at any time through your
              account settings. Upon termination, your data will be handled in accordance with our
              Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">9. Changes to Terms</h2>
            <p>
              We may modify these terms at any time. Continued use of the Service after changes
              constitutes acceptance of the new terms. We will notify users of material changes via
              email or platform notification.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">10. Contact</h2>
            <p>
              For questions about these terms, contact us at{' '}
              <span className="text-foreground">legal@autopostagent.com</span> or visit our{' '}
              <a href="/contact" className="text-foreground underline underline-offset-2">
                Contact page
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
