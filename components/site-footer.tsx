import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold">Product</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <h3 className="text-sm font-semibold">AutoPost Agent</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              AI-powered content scheduling and publishing platform.
            </p>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-medium text-foreground">Brandica</span> | Engineered by{' '}
            <span className="font-medium text-foreground">EchoSage</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
