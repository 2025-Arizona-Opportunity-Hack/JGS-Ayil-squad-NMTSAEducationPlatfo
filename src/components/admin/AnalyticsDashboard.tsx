import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Download,
} from "lucide-react";

const PERIOD_OPTIONS = [
  { label: "7 Days", value: 7 },
  { label: "30 Days", value: 30 },
  { label: "90 Days", value: 90 },
  { label: "1 Year", value: 365 },
] as const;

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
];

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function formatShortDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">—</span>;
  if (previous === 0) return <span className="text-xs text-green-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> New</span>;

  const pctChange = ((current - previous) / previous) * 100;
  if (Math.abs(pctChange) < 1) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0%</span>;

  return pctChange > 0 ? (
    <span className="text-xs text-green-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +{pctChange.toFixed(0)}%</span>
  ) : (
    <span className="text-xs text-red-500 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> {pctChange.toFixed(0)}%</span>
  );
}

export function AnalyticsDashboard() {
  const [periodDays, setPeriodDays] = useState(30);
  const data = useQuery(api.analytics.getDashboardAnalytics, { periodDays });

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
            <p className="text-muted-foreground mt-1">Loading dashboard data...</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="pt-6"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const { kpis, viewsTimeSeries, revenueTimeSeries, userGrowthTimeSeries, contentTypeData, userRoleData, topContent } = data;
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === periodDays)?.label || `${periodDays} Days`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Platform performance over the last {periodLabel.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={periodDays === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodDays(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Content Views"
          value={kpis.totalViews.toLocaleString()}
          icon={<Eye className="w-4 h-4 text-blue-600" />}
          trend={<TrendBadge current={kpis.totalViews} previous={kpis.prevTotalViews} />}
          subtitle={`vs prev ${periodLabel.toLowerCase()}`}
        />
        <KPICard
          title="Active Users"
          value={kpis.uniqueUsers.toLocaleString()}
          icon={<Users className="w-4 h-4 text-green-600" />}
          trend={<TrendBadge current={kpis.uniqueUsers} previous={kpis.prevUniqueUsers} />}
          subtitle={`${kpis.totalUsers} total users`}
        />
        <KPICard
          title="Revenue"
          value={formatCurrency(kpis.revenue)}
          icon={<DollarSign className="w-4 h-4 text-amber-600" />}
          trend={<TrendBadge current={kpis.revenue} previous={kpis.prevRevenue} />}
          subtitle={`${kpis.ordersInPeriod} orders`}
        />
        <KPICard
          title="Content Library"
          value={kpis.publishedContent.toString()}
          icon={<FileText className="w-4 h-4 text-purple-600" />}
          trend={<span className="text-xs text-muted-foreground">{kpis.totalAccessGrants} access grants</span>}
          subtitle={`${kpis.totalContent} total items`}
        />
      </div>

      {/* Charts Row 1: Views + Revenue */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Views Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Content Views
            </CardTitle>
            <CardDescription>Daily views over the last {periodLabel.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={viewsTimeSeries}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(label) => new Date(label + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    formatter={(value: number) => [value, "Views"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Area type="monotone" dataKey="views" stroke="#3b82f6" fill="url(#viewsGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Revenue
            </CardTitle>
            <CardDescription>Daily revenue over the last {periodLabel.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTimeSeries}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    labelFormatter={(label) => new Date(label + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revenueGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Content Types + User Roles + New Users */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Content Type Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Content Library</CardTitle>
            <CardDescription>Breakdown by content type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contentTypeData}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={2}
                    label={({ type, count }) => `${type} (${count})`}
                  >
                    {contentTypeData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Roles */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">User Breakdown</CardTitle>
            <CardDescription>Users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userRoleData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="role" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* New Users Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">User Growth</CardTitle>
            <CardDescription>New registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowthTimeSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(label) => new Date(label + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    formatter={(value: number) => [value, "New Users"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Bar dataKey="newUsers" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Content Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Content</CardTitle>
          <CardDescription>Most viewed content in the last {periodLabel.toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent>
          {topContent.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No views recorded in this period</p>
          ) : (
            <div className="space-y-3">
              {topContent.map((item, i) => (
                <div key={item.contentId} className="flex items-center gap-4">
                  <span className="text-lg font-bold text-muted-foreground w-8 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.type === "pdf" ? "PDF" : item.type === "richtext" ? "Article" : item.type}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />
                    {item.views}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  trend,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: React.ReactNode;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between mt-1">
          {trend}
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </CardContent>
    </Card>
  );
}
