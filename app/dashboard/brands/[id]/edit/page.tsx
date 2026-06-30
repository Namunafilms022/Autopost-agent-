'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { BrandForm } from '@/components/brand-form';
import { getBrand, updateBrand, uploadLogo } from '@/services/brand';
import type { Brand, BrandFormSubmit } from '@/types/brand';

export default function EditBrandPage() {
  const router = useRouter();
  const params = useParams();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getBrand(params.id as string)
      .then(setBrand)
      .catch(() => {
        toast.error('Brand not found');
        router.push('/dashboard/brands');
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleSubmit = async (data: BrandFormSubmit) => {
    setIsSubmitting(true);
    try {
      let logo_url = data.logo_url;
      if (data.logo_file) {
        logo_url = await uploadLogo(data.logo_file);
      }

      await updateBrand(params.id as string, {
        ...data,
        logo_url,
      });

      toast.success('Brand updated');
      router.push('/dashboard/brands');
    } catch {
      toast.error('Failed to update brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (!brand) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Brand</h1>
        <p className="text-muted-foreground">Update {brand.brand_name}&apos;s details.</p>
      </div>
      <BrandForm
        defaultValues={brand}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
