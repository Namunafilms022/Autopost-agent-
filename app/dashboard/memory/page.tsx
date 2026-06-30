'use client';

import { Brain, Save, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getUserProfile, upsertUserProfile } from '@/services/memory';
import type { UserProfile, UserProfileInput } from '@/types/memory';
import {
  WRITING_STYLES,
  EMOJI_PREFERENCES,
  CAPTION_LENGTHS,
  PLATFORM_OPTIONS,
} from '@/types/memory';

export default function MemoryPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef(false);

  const [writingStyle, setWritingStyle] = useState('');
  const [emojiPref, setEmojiPref] = useState('');
  const [captionLength, setCaptionLength] = useState('');
  const [ctaPref, setCtaPref] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [favoriteHashtags, setFavoriteHashtags] = useState<string[]>([]);
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
      if (data) {
        setWritingStyle(data.writing_style ?? '');
        setEmojiPref(data.emoji_preference ?? '');
        setCaptionLength(data.caption_length ?? '');
        setCtaPref(data.cta_preference ?? '');
        setFavoriteHashtags(data.favorite_hashtags ?? []);
        setPreferredPlatforms(data.preferred_platforms ?? []);
        setAdditionalNotes(data.additional_notes ?? '');
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    if (!profile) return true;
    return (
      writingStyle !== (profile.writing_style ?? '') ||
      emojiPref !== (profile.emoji_preference ?? '') ||
      captionLength !== (profile.caption_length ?? '') ||
      ctaPref !== (profile.cta_preference ?? '') ||
      JSON.stringify(favoriteHashtags) !== JSON.stringify(profile.favorite_hashtags ?? []) ||
      JSON.stringify(preferredPlatforms) !== JSON.stringify(profile.preferred_platforms ?? []) ||
      additionalNotes !== (profile.additional_notes ?? '')
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const input: UserProfileInput = {
        writing_style: writingStyle || undefined,
        emoji_preference: emojiPref || undefined,
        caption_length: captionLength || undefined,
        cta_preference: ctaPref || undefined,
        favorite_hashtags: favoriteHashtags,
        preferred_platforms: preferredPlatforms,
        additional_notes: additionalNotes || undefined,
      };
      const saved = await upsertUserProfile(input);
      setProfile(saved);
      setChanged(false);
      toast.success('Ghost memory saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (!tag) return;
    if (favoriteHashtags.includes(tag)) {
      toast.error('Already added');
      return;
    }
    setFavoriteHashtags((prev) => [...prev, tag]);
    setHashtagInput('');
    setChanged(true);
  };

  const removeHashtag = (tag: string) => {
    setFavoriteHashtags((prev) => prev.filter((h) => h !== tag));
    setChanged(true);
  };

  const togglePlatform = (p: string) => {
    setPreferredPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
    setChanged(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addHashtag();
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Brain className="h-6 w-6 text-primary" />
            Ghost Memory
          </h1>
          <p className="text-muted-foreground">
            Ghost AI will remember your preferences and use them in every generation.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges()}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Writing Style</CardTitle>
          <CardDescription>How should Ghost write your posts?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Style</Label>
            <Select value={writingStyle} onValueChange={(v) => { v && setWritingStyle(v); setChanged(true); }}>
              <SelectTrigger>
                <SelectValue placeholder="Auto (let Ghost decide)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto (let Ghost decide)</SelectItem>
                {WRITING_STYLES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Emoji Preference</Label>
            <Select value={emojiPref} onValueChange={(v) => { v && setEmojiPref(v); setChanged(true); }}>
              <SelectTrigger>
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto</SelectItem>
                {EMOJI_PREFERENCES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Caption Length</Label>
            <Select value={captionLength} onValueChange={(v) => { v && setCaptionLength(v); setChanged(true); }}>
              <SelectTrigger>
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto</SelectItem>
                {CAPTION_LENGTHS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Call to Action</Label>
            <Input
              value={ctaPref}
              onChange={(e) => { setCtaPref(e.target.value); setChanged(true); }}
              placeholder="e.g., Link in bio, Shop now, Comment below, Follow for more..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favorite Hashtags</CardTitle>
          <CardDescription>These will be used when relevant to the content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a hashtag and press Enter"
            />
            <Button variant="outline" onClick={addHashtag}>Add</Button>
          </div>
          {favoriteHashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {favoriteHashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeHashtag(tag)}>
                  #{tag} ✕
                </Badge>
              ))}
            </div>
          )}
          {favoriteHashtags.length === 0 && (
            <p className="text-xs text-muted-foreground">No hashtags added yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferred Platforms</CardTitle>
          <CardDescription>Ghost will prioritize these platforms when suggesting content.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((p) => (
              <Badge
                key={p}
                variant={preferredPlatforms.includes(p) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => togglePlatform(p)}
              >
                {p}
              </Badge>
            ))}
          </div>
          {preferredPlatforms.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">None selected. Ghost will use all platforms.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
          <CardDescription>Anything else Ghost should know about your brand voice.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={additionalNotes}
            onChange={(e) => { setAdditionalNotes(e.target.value); setChanged(true); }}
            placeholder="e.g., Always use a welcoming tone. Avoid jargon. Use industry-specific terminology. Reference recent trends..."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
