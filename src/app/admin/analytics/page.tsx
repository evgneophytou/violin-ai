'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Users,
  Clock,
  Activity,
  RefreshCw,
  LogOut,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { FeatureUsageChart } from '@/components/admin/FeatureUsageChart';
import { UsageTrendsChart } from '@/components/admin/UsageTrendsChart';
import { UnusedFeaturesAlert } from '@/components/admin/UnusedFeaturesAlert';
import { FeatureSessionsTable } from '@/components/admin/FeatureSessionsTable';

interface AnalyticsData {
  overview: {
    totalSessions: number;
    totalUsers: number;
    totalDuration: number; // minutes
    avgSessionDuration: number;
  };
  featureUsage: Array<{
    feature: string;
    sessions: number;
    duration: number;
    users: number;
  }>;
  trends: Array<{
    date: string;
    sessions: number;
    users: number;
    duration: number;
  }>;
  unusedFeatures: Array<{
    feature: string;
    usagePercent: number;
    lastUsed: string | null;
    trend: 'declining' | 'stable' | 'none';
  }>;
  featureStats: Array<{
    feature: string;
    sessions: number;
    uniqueUsers: number;
    avgDuration: number;
    trend: number;
  }>;
}

interface AdminUser {
  email: string;
  role: string;
}

export default function AdminAnalyticsDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7');

  // Check auth and fetch data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authRes = await fetch('/api/admin/auth');
        const authData = await authRes.json();

        if (!authData.authenticated) {
          router.push('/admin/login');
          return;
        }

        setUser(authData.user);
        fetchAnalytics();
      } catch {
        router.push('/admin/login');
      }
    };

    checkAuth();
  }, [router]);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/analytics?days=${dateRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [dateRange, user, fetchAnalytics]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold">Analytics Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                Feature usage monitoring
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchAnalytics}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex items-center gap-2">
              <Badge variant="outline">{user.role}</Badge>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
            
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <Card className="mb-6 border-red-200 dark:border-red-800">
            <CardContent className="flex items-center gap-2 py-4 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-auto"
                onClick={fetchAnalytics}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && !data ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Total Sessions</span>
                  </div>
                  <p className="text-3xl font-bold mt-2">
                    {data.overview.totalSessions.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Unique Users</span>
                  </div>
                  <p className="text-3xl font-bold mt-2">
                    {data.overview.totalUsers.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Total Time</span>
                  </div>
                  <p className="text-3xl font-bold mt-2">
                    {Math.round(data.overview.totalDuration / 60)}h
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Avg Session</span>
                  </div>
                  <p className="text-3xl font-bold mt-2">
                    {data.overview.avgSessionDuration.toFixed(1)}m
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FeatureUsageChart 
                data={data.featureUsage}
                title="Feature Usage (Sessions)"
                metric="sessions"
              />
              <UsageTrendsChart 
                data={data.trends}
                title={`Usage Trends (${dateRange} days)`}
              />
            </div>

            {/* Alerts and Table Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <UnusedFeaturesAlert 
                  features={data.unusedFeatures}
                  threshold={5}
                />
              </div>
              <div className="lg:col-span-2">
                <FeatureSessionsTable 
                  data={data.featureStats}
                  title="Detailed Feature Statistics"
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
