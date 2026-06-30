'use client';

import { Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BRAND_TONES, INDUSTRIES, LANGUAGES } from '@/types/brand';
import type { BrandFormData, BrandFormSubmit } from '@/types/brand';

interface Props {
  defaultValues?: Partial<BrandFormData>;
  onSubmit: (data: BrandFormSubmit) => Promise<void>;
  isSubmitting: boolean;
}

export function BrandForm({ defaultValues, onSubmit, isSubmitting }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [brandName, setBrandName] = useState(defaultValues?.brand_name ?? '');
  const [website, setWebsite] = useState(defaultValues?.website ?? '');
  const [industry, setIndustry] = useState(defaultValues?.industry ?? '');
  const [description, setDescription] = useState(defaultValues?.description ?? '');
  const [primaryColor, setPrimaryColor] = useState(defaultValues?.primary_color ?? '#000000');
  const [secondaryColor, setSecondaryColor] = useState(defaultValues?.secondary_color ?? '#ffffff');
  const [targetAudience, setTargetAudience] = useState(defaultValues?.target_audience ?? '');
  const [brandTone, setBrandTone] = useState(defaultValues?.brand_tone ?? '');
  const [language, setLanguage] = useState(defaultValues?.language ?? 'en');
  const [logoPreview, setLogoPreview] = useState<string | null>(defaultValues?.logo_url ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brandName.trim()) {
      toast.error('Brand name is required');
      return;
    }

    const payload: BrandFormSubmit = {
      brand_name: brandName.trim(),
      website: website.trim() || null,
      industry: industry || null,
      description: description.trim() || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      target_audience: targetAudience.trim() || null,
      brand_tone: brandTone || null,
      language,
      logo_url: logoPreview,
    };
    if (logoFile) payload.logo_file = logoFile;
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Brand Name */}
      <div className="space-y-2">
        <Label htmlFor="brandName">Brand Name *</Label>
        <Input
          id="brandName"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="Enter brand name"
          required
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            type="url"
          />
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select value={industry} onValueChange={(v) => setIndustry(v ?? '')}>
            <SelectTrigger id="industry">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the brand..."
          rows={3}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Primary Color */}
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary Color</Label>
          <div className="flex items-center gap-3">
            <input
              id="primaryColor"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border bg-transparent p-0.5"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        {/* Secondary Color */}
        <div className="space-y-2">
          <Label htmlFor="secondaryColor">Secondary Color</Label>
          <div className="flex items-center gap-3">
            <input
              id="secondaryColor"
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border bg-transparent p-0.5"
            />
            <Input
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Target Audience */}
        <div className="space-y-2">
          <Label htmlFor="targetAudience">Target Audience</Label>
          <Input
            id="targetAudience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g., Young professionals, ages 25-40"
          />
        </div>

        {/* Brand Tone */}
        <div className="space-y-2">
          <Label htmlFor="brandTone">Brand Tone</Label>
          <Select value={brandTone} onValueChange={(v) => setBrandTone(v ?? '')}>
            <SelectTrigger id="brandTone">
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              {BRAND_TONES.map((tone) => (
                <SelectItem key={tone} value={tone}>
                  {tone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label htmlFor="language">Language</Label>
          <Select value={language} onValueChange={(v) => setLanguage(v ?? 'en')}>
          <SelectTrigger id="language" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label>Logo</Label>
        {logoPreview ? (
          <div className="relative inline-block">
            <img
              src={logoPreview}
              alt="Logo preview"
              className="h-24 w-24 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={clearLogo}
              className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50"
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground">SVG, PNG, or JPG. Max 2MB.</p>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Brand'}
        </Button>
      </div>
    </form>
  );
}
