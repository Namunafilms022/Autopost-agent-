'use client';

import {
  CheckCircle2, AlertCircle, Link2, Unlink, ExternalLink, Copy, Check,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  getSocialAccounts, connectSocialAccount, disconnectSocialAccount, deleteSocialAccount,
} from '@/services/social';
import type { SocialAccount } from '@/types/social';
import { SOCIAL_PLATFORMS, PLATFORM_OAUTH_URLS } from '@/types/social';

const PLATFORM_LOGOS: Record<string, string> = {
  Instagram: '📷',
  Facebook: '👍',
  LinkedIn: '💼',
  X: '🐦',
  Threads: '🧵',
};

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState<string>('');
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [disconnectId, setDisconnectId] = useState<string | null>(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getSocialAccounts()
      .then(setAccounts)
      .catch(() => toast.error('Failed to load social accounts'))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    if (!connectPlatform || !accountName.trim() || !accessToken.trim()) {
      toast.error('Platform, account name, and token are required');
      return;
    }
    setSaving(true);
    try {
      const result = await connectSocialAccount({
        platform: connectPlatform as SocialAccount['platform'],
        account_name: accountName.trim(),
        account_id: accountId.trim() || accountName.trim(),
        access_token: accessToken.trim(),
        refresh_token: refreshToken.trim() || undefined,
      });
      setAccounts((prev) => {
        const filtered = prev.filter((a) => a.platform !== connectPlatform);
        return [...filtered, result];
      });
      toast.success(`${connectPlatform} connected`);
      setConnectOpen(false);
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectId) return;
    const account = accounts.find((a) => a.id === disconnectId);
    try {
      await disconnectSocialAccount(disconnectId);
      setAccounts((prev) => prev.filter((a) => a.id !== disconnectId));
      toast.success(`${account?.platform} disconnected`);
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnectId(null);
    }
  };

  const resetForm = () => {
    setConnectPlatform('');
    setAccountName('');
    setAccountId('');
    setAccessToken('');
    setRefreshToken('');
  };

  const openConnect = (platform: string) => {
    setConnectPlatform(platform);
    setConnectOpen(true);
  };

  const copyOAuthUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const connectedPlatforms = accounts
    .filter((a) => a.status === 'connected')
    .map((a) => a.platform);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Accounts</h1>
        <p className="text-muted-foreground">Connect your social media accounts for posting.</p>
      </div>

      {/* Platform Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SOCIAL_PLATFORMS.map((pf) => {
          const account = accounts.find(
            (a) => a.platform === pf.name && a.status === 'connected',
          );
          const isConnected = !!account;
          return (
            <Card key={pf.name} className={isConnected ? 'border-green-500/50' : ''}>
              <CardContent className="flex flex-col items-center gap-3 pt-6">
                <div className={`flex size-12 items-center justify-center rounded-full ${pf.bg}`}>
                  <span className="text-xl">{PLATFORM_LOGOS[pf.name]}</span>
                </div>
                <div className="text-center">
                  <p className="font-semibold">{pf.name}</p>
                  {isConnected ? (
                    <div className="mt-1 space-y-1">
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {account.account_name}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not connected</p>
                  )}
                </div>
                {isConnected ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openConnect(pf.name)}>
                      Reconnect
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDisconnectId(account.id)}
                    >
                      <Unlink className="mr-1 h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => openConnect(pf.name)}>
                    <Link2 className="mr-1 h-3.5 w-3.5" />
                    Connect
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connected Accounts Summary */}
      {accounts.filter((a) => a.status === 'connected').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>Manage your active connections.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accounts
                .filter((a) => a.status === 'connected')
                .map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{PLATFORM_LOGOS[a.platform]}</span>
                      <div>
                        <p className="text-sm font-medium">{a.account_name}</p>
                        <p className="text-xs text-muted-foreground">{a.platform}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connect Dialog */}
      <Dialog
        open={connectOpen}
        onOpenChange={(o) => {
          if (!o) resetForm();
          setConnectOpen(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {connectPlatform}</DialogTitle>
            <DialogDescription>
              Enter your {connectPlatform} API credentials or use OAuth.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* OAuth URL */}
            {connectPlatform && PLATFORM_OAUTH_URLS[connectPlatform] && (
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  OAuth Authorization URL
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                    {PLATFORM_OAUTH_URLS[connectPlatform]}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyOAuthUrl(PLATFORM_OAUTH_URLS[connectPlatform])}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2">
                  <a
                    href={PLATFORM_OAUTH_URLS[connectPlatform]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open OAuth page
                  </a>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="accName">Account Name</Label>
              <Input
                id="accName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., My Business Page"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accId">Account ID (optional)</Label>
              <Input
                id="accId"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Platform user/page ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accToken">Access Token</Label>
              <Input
                id="accToken"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste your access token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accRefresh">Refresh Token (optional)</Label>
              <Input
                id="accRefresh"
                type="password"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                placeholder="Paste refresh token if available"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConnectOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={saving}>
              {saving ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Dialog */}
      <Dialog open={!!disconnectId} onOpenChange={(o) => !o && setDisconnectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Account</DialogTitle>
            <DialogDescription>
              This will remove the connection. You can reconnect anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisconnect}>
              <Unlink className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
