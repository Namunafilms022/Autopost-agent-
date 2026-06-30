'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { BrandForm } from '@/components/brand-form';
import { createBrand, uploadLogo } from '@/services/brand';
import type { BrandFormSubmit } from '@/types/brand';

export default function NewBrandPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: BrandFormSubmit) => {
    setIsSubmitting(true);
    try {
      let logo_url = data.logo_url;
      if (data.logo_file) {
        logo_url = await uploadLogo(data.logo_file);
      }

      await createBrand({
        ...data,
        logo_url,
      });

      toast.success('Brand created');
      router.push('/dashboard/brands');
    } catch {
      toast.error('Failed to create brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Brand</h1>
        <p className="text-muted-foreground">Add a new brand to manage its content.</p>
      </div>
      <BrandForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
