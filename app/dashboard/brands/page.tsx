'use client';

import { Plus, ExternalLink, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getBrands, deleteBrand } from '@/services/brand';
import type { Brand } from '@/types/brand';

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-4 w-4 rounded-full border"
      style={{ backgroundColor: color }}
    />
  );
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getBrands()
      .then(setBrands)
      .catch(() => toast.error('Failed to load brands'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBrand(deleteId);
      toast.success('Brand deleted');
      setBrands((prev) => prev.filter((b) => b.id !== deleteId));
    } catch {
      toast.error('Failed to delete brand');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brands</h1>
          <p className="text-muted-foreground">Manage your brands and their content profiles.</p>
        </div>
        <Link
          href="/dashboard/brands/new"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Brand
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Brands</CardTitle>
          <CardDescription>
            {brands.length} brand{brands.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : brands.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <p className="text-muted-foreground">No brands yet.</p>
              <Link
                href="/dashboard/brands/new"
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted hover:text-foreground"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create your first brand
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead className="hidden md:table-cell">Industry</TableHead>
                    <TableHead className="hidden lg:table-cell">Colors</TableHead>
                    <TableHead className="hidden sm:table-cell">Tone</TableHead>
                    <TableHead className="hidden lg:table-cell">Language</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {brand.logo_url ? (
                            <img
                              src={brand.logo_url}
                              alt={brand.brand_name}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                              {brand.brand_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/dashboard/brands/${brand.id}`}
                              className="font-medium hover:underline"
                            >
                              {brand.brand_name}
                            </Link>
                            {brand.website && (
                              <p className="text-xs text-muted-foreground">{brand.website}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {brand.industry && (
                          <Badge variant="secondary">{brand.industry}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <ColorDot color={brand.primary_color} />
                          <ColorDot color={brand.secondary_color} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {brand.brand_tone ?? '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {brand.language.toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/dashboard/brands/${brand.id}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/brands/${brand.id}/edit`}
                            className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted hover:text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteId(brand.id)}
                            className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted hover:text-foreground"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brand</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
