'use client';

import {
  Building2,
  Sparkles,
  ListOrdered,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAnalytics, type AnalyticsData } from '@/services/analytics';

const statCards = [
  {
    label: 'Total Brands',
    key: 'totalBrands' as const,
    icon: Building2,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'Total Generated',
    key: 'totalGenerated' as const,
    icon: Sparkles,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    label: 'Scheduled',
    key: 'scheduled' as const,
    icon: ListOrdered,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'Posted',
    key: 'posted' as const,
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    label: 'Failed',
    key: 'failed' as const,
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getAnalytics().then(setData);
  }, []);

  if (!data) {
    return <p className="text-muted-foreground">Loading analytics...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Overview of your content performance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = data[card.key];
          return (
            <Card key={card.key}>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex size-10 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Generated — Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Posts Generated</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val: string) => val.slice(5)}
                    className="text-muted-foreground"
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                    labelFormatter={(val) => typeof val === 'string' ? new Date(val).toLocaleDateString() : ''}
                  />
                  <Bar dataKey="generated" name="Generated" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Posted — Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Posts Posted</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val: string) => val.slice(5)}
                    className="text-muted-foreground"
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                    labelFormatter={(val) => typeof val === 'string' ? new Date(val).toLocaleDateString() : ''}
                  />
                  <Line
                    type="monotone"
                    dataKey="posted"
                    name="Posted"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#22c55e' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative — Combined Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Generated vs Posted</CardTitle>
          <CardDescription>Daily comparison over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val: string) => val.slice(5)}
                  className="text-muted-foreground"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                   labelFormatter={(val) => typeof val === 'string' ? new Date(val).toLocaleDateString() : ''}
                />
                <Legend />
                <Bar dataKey="generated" name="Generated" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="posted" name="Posted" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
