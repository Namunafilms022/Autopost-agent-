'use client';

import { ArrowLeft, Edit, Globe, Palette, Users, MessageSquare, Globe2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBrand } from '@/services/brand';
import type { Brand } from '@/types/brand';

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBrand(params.id as string)
      .then(setBrand)
      .catch(() => {
        toast.error('Brand not found');
        router.push('/dashboard/brands');
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (!brand) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/brands"
          className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg font-bold text-muted-foreground">
                {brand.brand_name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{brand.brand_name}</h1>
              {brand.industry && <Badge variant="secondary">{brand.industry}</Badge>}
            </div>
          </div>
        </div>
        <Link
          href={`/dashboard/brands/${brand.id}/edit`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Brand Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow icon={<Globe className="h-4 w-4" />} label="Website" value={brand.website} />
            <DetailRow icon={<Palette className="h-4 w-4" />} label="Primary Color" value={brand.primary_color} />
            <DetailRow icon={<Palette className="h-4 w-4" />} label="Secondary Color" value={brand.secondary_color} />
            <DetailRow icon={<Users className="h-4 w-4" />} label="Target Audience" value={brand.target_audience} />
            <DetailRow icon={<MessageSquare className="h-4 w-4" />} label="Brand Tone" value={brand.brand_tone} />
            <DetailRow icon={<Globe2 className="h-4 w-4" />} label="Language" value={brand.language?.toUpperCase()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            {brand.description ? (
              <p className="text-sm">{brand.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No description provided.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <div
          className="h-16 flex-1 rounded-lg border"
          style={{ backgroundColor: brand.primary_color }}
        />
        <div
          className="h-16 flex-1 rounded-lg border"
          style={{ backgroundColor: brand.secondary_color }}
        />
      </div>
    </div>
  );
}
