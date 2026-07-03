import { Card, CardContent } from '@/components/ui/card';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">About AutoPost Agent</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            AI-powered content scheduling and publishing for modern teams.
          </p>
        </div>

        <div className="mt-12 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold">Our Mission</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              AutoPost Agent eliminates the friction between content creation and distribution. We
              help businesses, creators, and marketing teams schedule, manage, and publish content
              across multiple platforms from a single intelligent dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">What We Do</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Our platform combines AI-powered content generation with seamless social media
              scheduling. From blog posts to social updates, AutoPost Agent handles the heavy
              lifting so you can focus on what matters most.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Our Technology</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Built on a modern stack with Next.js and Supabase, AutoPost Agent leverages advanced
              AI models for content generation, intelligent scheduling algorithms, and a robust
              provider system for multi-platform publishing.
            </p>
          </section>

          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Powered by <span className="font-semibold text-foreground">Brandica</span> |
                Engineered by <span className="font-semibold text-foreground">EchoSage</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
