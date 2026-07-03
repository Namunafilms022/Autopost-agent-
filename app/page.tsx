import Link from 'next/link';
import { ArrowRight, Bot, Calendar, Share2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Bot,
    title: 'AI Content Generation',
    description: 'Generate posts, captions, and articles with advanced AI models tailored to your brand voice.',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Schedule content across multiple platforms with an intelligent calendar that learns your optimal posting times.',
  },
  {
    icon: Share2,
    title: 'Multi-Platform Publishing',
    description: 'Publish to LinkedIn, X, and TikTok from a single dashboard. More platforms coming soon.',
  },
  {
    icon: Sparkles,
    title: 'Brand Consistency',
    description: 'Maintain consistent messaging across all channels with brand guidelines and approval workflows.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold">
            AutoPost Agent
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
              About
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
              Contact
            </Link>
            <Link href="/login">
              <Button variant="default" size="sm">
                Sign In
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Schedule Smarter.
            <br />
            <span className="text-primary">Publish Everywhere.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            AutoPost Agent combines AI-powered content generation with seamless multi-platform
            scheduling. Create once, publish everywhere.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Everything You Need</h2>
            <p className="mt-4 text-muted-foreground">
              A complete content operations platform for modern teams.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-0 bg-muted/50">
                  <CardHeader>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="mt-4 text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight">Ready to Streamline Your Content?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join teams using AutoPost Agent to save time and stay consistent across every platform.
          </p>
          <div className="mt-8">
            <Link href="/login">
              <Button size="lg">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
