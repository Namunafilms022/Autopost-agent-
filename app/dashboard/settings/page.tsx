'use client';

import { Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSettings, upsertSettings } from '@/services/settings';
import { TIMEZONES, TONES, LANGUAGES } from '@/types/settings';
import type { UserSettingsInput } from '@/types/settings';

export default function SettingsPage() {
  const { toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef(false);

  const [fullName, setFullName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [defaultTone, setDefaultTone] = useState('Professional');
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getSettings()
      .then((data) => {
        if (data) {
          setFullName(data.full_name ?? '');
          setApiKey(data.openrouter_api_key ?? '');
          setTimezone(data.timezone);
          setDefaultLanguage(data.default_language);
          setDefaultTone(data.default_tone);
          setDarkMode(data.dark_mode);
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const input: UserSettingsInput = {
        full_name: fullName.trim() || null,
        openrouter_api_key: apiKey.trim() || null,
        timezone,
        default_language: defaultLanguage,
        default_tone: defaultTone,
        dark_mode: darkMode,
      };
      await upsertSettings(input);
      toast.success('Settings saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your account and preferences.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name and personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Your OpenRouter API key for AI content generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenRouter API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
            />
            <p className="text-xs text-muted-foreground">
              Stored securely in your account. Get a key at{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Default settings for new content generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={(v) => setTimezone(v ?? 'UTC')}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lang">Default Language</Label>
            <Select value={defaultLanguage} onValueChange={(v) => setDefaultLanguage(v ?? 'en')}>
              <SelectTrigger id="lang">
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

          <div className="space-y-2">
            <Label htmlFor="tone">Default Tone</Label>
            <Select value={defaultTone} onValueChange={(v) => setDefaultTone(v ?? 'Professional')}>
              <SelectTrigger id="tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((tone) => (
                  <SelectItem key={tone} value={tone}>
                    {tone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Toggle dark mode for the dashboard.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={darkMode}
              onClick={() => {
                setDarkMode(!darkMode);
                toggleTheme();
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors outline-none ${
                darkMode ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-sm ring-0 transition-transform ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
