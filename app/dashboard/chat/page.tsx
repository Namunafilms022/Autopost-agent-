'use client';

import { supabase } from '@/lib/supabase';

import { Copy, Check, Send, Bot, User, RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface GhostResponse {
  inferred: {
    platform: string;
    contentType: string;
    style: string;
    reasoning: string;
  };
  caption: string;
  hashtags: string;
  imagePrompt: string;
}

interface Message {
  role: 'user' | 'ghost';
  content: string;
  data?: GhostResponse;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ghost',
      content: 'Hi, I\'m Ghost. Tell me what you want to post — I\'ll figure out the rest.',
    },
  ]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || generating) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, supabaseToken: session?.access_token }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data: GhostResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'ghost',
          content: `**${data.inferred.platform}** · ${data.inferred.contentType} · *${data.inferred.style}*`,
          data,
        },
      ]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate');
      setMessages((prev) => [
        ...prev,
        { role: 'ghost', content: 'Sorry, something went wrong. Try again.' },
      ]);
    } finally {
      setGenerating(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyText = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">AI Chat</h1>
        <p className="text-muted-foreground">
          Tell Ghost what you need — it figures out the platform, style, and content.
        </p>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === 'user' ? 'bg-primary/10' : 'bg-purple-500/10'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="h-4 w-4 text-primary" />
              ) : (
                <Bot className="h-4 w-4 text-purple-500" />
              )}
            </div>
            <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
              {msg.role === 'ghost' && msg.data ? (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs text-muted-foreground">
                        {msg.content}
                      </CardTitle>
                      <span className="text-[10px] text-muted-foreground">
                        {msg.data.inferred.reasoning}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {/* Caption */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Caption</span>
                        <button
                          type="button"
                          onClick={() => copyText(msg.data!.caption, i)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copiedIndex === i ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="whitespace-pre-wrap rounded-lg bg-muted p-3">
                        {msg.data.caption}
                      </p>
                    </div>
                    {/* Hashtags */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Hashtags</span>
                        <button
                          type="button"
                          onClick={() => copyText(msg.data!.hashtags, i + 100)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copiedIndex === i + 100 ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-primary">{msg.data.hashtags}</p>
                    </div>
                    {/* Image Prompt */}
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Image Prompt</span>
                      <p className="mt-1 text-muted-foreground">{msg.data.imagePrompt}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div
                  className={`inline-block rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}

        {generating && (
          <div className="flex gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-purple-500/10">
              <Bot className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Ghost is thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., I need an Instagram reel about AI..."
          disabled={generating}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={!input.trim() || generating} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
