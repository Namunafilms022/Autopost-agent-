'use client';

import {
  Upload,
  Search,
  X,
  ImageIcon,
  VideoIcon,
  Trash2,
  FileUp,
  Tag,
} from 'lucide-react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAssets, deleteAsset, uploadAsset, formatSize } from '@/services/asset';
import { getBrands } from '@/services/brand';
import type { Asset } from '@/types/asset';
import type { Brand } from '@/types/brand';

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadBrand, setUploadBrand] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploading, setUploading] = useState(false);

  const [previewItem, setPreviewItem] = useState<Asset | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    Promise.all([getAssets(), getBrands()])
      .then(([a, b]) => {
        setAssets(a);
        setBrands(b);
      })
      .catch(() => toast.error('Failed to load assets'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (brandFilter !== 'all' && a.brand_id !== brandFilter) return false;
      return true;
    });
  }, [assets, search, typeFilter, brandFilter]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File must be under 50MB');
      return;
    }
    setUploadFile(file);
    setUploadName(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) {
      toast.error('File and name are required');
      return;
    }
    setUploading(true);
    try {
      const tags = uploadTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const asset = await uploadAsset(uploadFile, {
        name: uploadName.trim(),
        brand_id: uploadBrand || null,
        tags,
      });
      setAssets((prev) => [asset, ...prev]);
      toast.success('Asset uploaded');
      setUploadOpen(false);
      setUploadFile(null);
      setUploadName('');
      setUploadBrand('');
      setUploadTags('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    const item = assets.find((a) => a.id === deleteId);
    if (!item) return;
    try {
      await deleteAsset(deleteId!, item.url);
      setAssets((prev) => prev.filter((a) => a.id !== deleteId));
      toast.success('Asset deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  const brandMap = useMemo(
    () => Object.fromEntries(brands.map((b) => [b.id, b.brand_name])),
    [brands],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Library</h1>
          <p className="text-muted-foreground">Upload and manage images and videos.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.brand_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || typeFilter !== 'all' || brandFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setTypeFilter('all');
              setBrandFilter('all');
            }}
            className="inline-flex h-8 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <FileUp className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            {assets.length === 0 ? 'No assets yet. Upload your first one.' : 'No assets match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-lg border bg-muted/30"
            >
              <button
                type="button"
                onClick={() => setPreviewItem(asset)}
                className="block w-full"
              >
                {asset.type === 'image' ? (
                  <div className="aspect-square">
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative flex aspect-square items-center justify-center bg-black/10">
                    <video
                      src={asset.url}
                      className="h-full w-full object-cover"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
                        <VideoIcon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </button>
              <div className="space-y-1 p-2">
                <p className="truncate text-xs font-medium">{asset.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(asset.size_bytes)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(asset.id);
                }}
                className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-md bg-background/80 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Asset</DialogTitle>
            <DialogDescription>Upload an image or video for your library.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {uploadFile ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                {uploadFile.type.startsWith('image') ? (
                  <img
                    src={URL.createObjectURL(uploadFile)}
                    alt=""
                    className="h-14 w-14 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded bg-muted">
                    <VideoIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{uploadFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(uploadFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadFile(null)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 hover:bg-muted/50">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select a file (max 50MB)
                </p>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
            <div className="space-y-2">
              <Label htmlFor="assetName">Name</Label>
              <Input
                id="assetName"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Asset name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetBrand">Brand (optional)</Label>
              <Select value={uploadBrand} onValueChange={(v) => setUploadBrand(v ?? '')}>
                <SelectTrigger id="assetBrand">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.brand_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetTags">Tags (comma-separated)</Label>
              <Input
                id="assetTags"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="e.g., product, behind-the-scenes, logo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !uploadFile}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={(o) => !o && setPreviewItem(null)}>
        <DialogContent className="max-w-2xl">
          {previewItem && (
            <>
              <DialogHeader>
                <DialogTitle>{previewItem.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {previewItem.type === 'image' ? (
                  <img
                    src={previewItem.url}
                    alt={previewItem.name}
                    className="max-h-96 w-full rounded-lg object-contain"
                  />
                ) : (
                  <video
                    src={previewItem.url}
                    controls
                    className="max-h-96 w-full rounded-lg"
                  />
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    <Badge variant="secondary" className="ml-1">
                      {previewItem.type === 'image' ? (
                        <ImageIcon className="mr-1 h-3 w-3" />
                      ) : (
                        <VideoIcon className="mr-1 h-3 w-3" />
                      )}
                      {previewItem.mime_type}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size:</span>{' '}
                    <span className="font-medium">{formatSize(previewItem.size_bytes)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Brand:</span>{' '}
                    <span className="font-medium">
                      {previewItem.brand_id ? brandMap[previewItem.brand_id] ?? '—' : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uploaded:</span>{' '}
                    <span className="font-medium">
                      {new Date(previewItem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {previewItem.tags.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Tags:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {previewItem.tags.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <Tag className="mr-1 h-3 w-3" />
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>Are you sure? This cannot be undone.</DialogDescription>
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
