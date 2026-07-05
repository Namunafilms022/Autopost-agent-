'use client';

import {
  CheckCircle2, AlertCircle, Link2, Unlink, RefreshCw, Clock, ExternalLink,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import {
  getSocialAccounts, connectSocialAccount, disconnectSocialAccount,
} from '@/services/social';
import type { SocialAccount } from '@/types/social';
import { SOCIAL_PLATFORMS } from '@/types/social';

const PLATFORM_LOGOS: Record<string, string> = {
  Instagram: '📷',
  Facebook: '👍',
  LinkedIn: '💼',
  X: '🐦',
  TikTok: '🎵',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualPlatform, setManualPlatform] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [saving, setSaving] = useState(false);

  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getSocialAccounts();
      setAccounts(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load social accounts';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadAccounts();

    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      toast.success('Account connected successfully');
      window.history.replaceState({}, '', '/dashboard/social');
      loadAccounts();
    }
    if (params.get('error')) {
      const errMsg = `Connection failed: ${params.get('error')}`;
      setOauthError(params.get('error')!);
      toast.error(errMsg, { duration: 10000 });
      console.error('[Social Page] Connection error:', params.get('error'));
    }
  }, [loadAccounts]);

  const handleOAuthConnect = async (platform: string) => {
    const pf = SOCIAL_PLATFORMS.find(p => p.name === platform);
    if (pf?.disabled) {
      toast.error(`${platform} is currently unavailable`);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const basePath = platform === 'Instagram'
      ? `/api/auth/${platform.toLowerCase()}/login`
      : `/api/auth/${platform.toLowerCase()}`;
    window.location.href = `${basePath}${token ? `?token=${token}` : ''}`;
  };

  const handleManualConnect = async () => {
    if (!manualPlatform || !accountName.trim() || !accessToken.trim()) {
      toast.error('Platform, account name, and token are required');
      return;
    }
    setSaving(true);
    try {
      const result = await connectSocialAccount({
        platform: manualPlatform as SocialAccount['platform'],
        account_name: accountName.trim(),
        account_id: accountId.trim() || accountName.trim(),
        access_token: accessToken.trim(),
        refresh_token: refreshToken.trim() || undefined,
      });
      setAccounts((prev) => {
        const filtered = prev.filter((a) => a.platform !== manualPlatform);
        return [...filtered, result];
      });
      toast.success(`${manualPlatform} connected`);
      setManualOpen(false);
      setManualPlatform('');
      setAccountName('');
      setAccountId('');
      setAccessToken('');
      setRefreshToken('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectId) return;
    setDisconnecting(true);
    const account = accounts.find((a) => a.id === disconnectId);
    try {
      await disconnectSocialAccount(disconnectId);
      setAccounts((prev) => prev.filter((a) => a.id !== disconnectId));
      toast.success(`${account?.platform} disconnected`);
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
      setDisconnectId(null);
    }
  };

  const openManual = (platform: string) => {
    setManualPlatform(platform);
    setManualOpen(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Accounts</h1>
          <p className="text-muted-foreground">Connect your social media accounts for posting.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAccounts} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loadError && !loading && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Failed to load accounts</p>
              <p className="text-xs text-muted-foreground">{loadError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadAccounts}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {oauthError && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">OAuth Connection Error</p>
              <p className="text-xs text-muted-foreground">{oauthError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOauthError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOCIAL_PLATFORMS.map((pf) => (
            <Card key={pf.name}>
              <CardContent className="flex flex-col items-center gap-3 pt-6">
                <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SOCIAL_PLATFORMS.map((pf) => {
              const account = accounts.find(
                (a) => a.platform === pf.name && a.status === 'connected',
              );
              const isConnected = !!account;
              const isDisabled = pf.disabled;
              return (
                <Card key={pf.name} className={`${isConnected ? 'border-green-500/50' : ''} ${isDisabled ? 'opacity-50' : ''}`}>
                  <CardContent className="flex flex-col items-center gap-3 pt-6">
                    <div className={`flex size-12 items-center justify-center rounded-full ${pf.bg}`}>
                      <span className="text-xl">{PLATFORM_LOGOS[pf.name]}</span>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{pf.name}</p>
                      {isDisabled ? (
                        <p className="text-xs text-muted-foreground">Coming soon</p>
                      ) : isConnected ? (
                        <div className="mt-1 space-y-1">
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            {account.account_name}
                          </Badge>
                          {account.connected_at && (
                            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {timeAgo(account.connected_at)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not connected</p>
                      )}
                    </div>
                    {isDisabled ? null : isConnected ? (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOAuthConnect(pf.name)}>
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
                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={() => handleOAuthConnect(pf.name)}>
                          <Link2 className="mr-1 h-3.5 w-3.5" />
                          Connect
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openManual(pf.name)}>
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          Manual
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

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
                        <div className="flex items-center gap-3">
                          {a.connected_at && (
                            <span className="text-xs text-muted-foreground">
                              <Clock className="mr-1 inline h-3 w-3" />
                              {timeAgo(a.connected_at)}
                            </span>
                          )}
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Connected
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Manual Connect Dialog */}
      <Dialog
        open={manualOpen}
        onOpenChange={(o) => {
          if (!o) {
            setManualPlatform('');
            setAccountName('');
            setAccountId('');
            setAccessToken('');
            setRefreshToken('');
          }
          setManualOpen(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {manualPlatform} (Manual)</DialogTitle>
            <DialogDescription>
              Paste your access token, or use OAuth for automatic setup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualConnect} disabled={saving}>
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
            <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
              <Unlink className="mr-2 h-4 w-4" />
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
