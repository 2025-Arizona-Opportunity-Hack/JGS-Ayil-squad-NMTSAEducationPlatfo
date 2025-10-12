import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
} from "lucide-react";

export function SalesAnalytics() {
  const analytics = useQuery(api.orders.getSalesAnalytics);

  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toFixed(2);
  };

  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const stats = [
    {
      title: "Total Revenue",
      value: `$${formatPrice(analytics.totalRevenue)}`,
      icon: DollarSign,
      description: "All-time earnings",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Orders",
      value: analytics.totalOrders.toString(),
      icon: ShoppingCart,
      description: "Completed purchases",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "This Month",
      value: `$${formatPrice(analytics.monthRevenue)}`,
      icon: TrendingUp,
      description: `${analytics.monthOrders} orders`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "This Week",
      value: `$${formatPrice(analytics.weekRevenue)}`,
      icon: Package,
      description: `${analytics.weekOrders} orders`,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Sales Analytics</h2>
        <p className="text-muted-foreground mt-2">
          Track your revenue and sales performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-full`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top Selling Content */}
      {analytics.topSellingContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topSellingContent.map((item, index) => (
                <div
                  key={item.contentId}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.count} {item.count === 1 ? "sale" : "sales"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      ${formatPrice(item.revenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">
                ${formatPrice(analytics.todayRevenue)}
              </p>
              <p className="text-sm text-muted-foreground">
                {analytics.todayOrders} {analytics.todayOrders === 1 ? "order" : "orders"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">
                ${formatPrice(analytics.weekRevenue)}
              </p>
              <p className="text-sm text-muted-foreground">
                {analytics.weekOrders} {analytics.weekOrders === 1 ? "order" : "orders"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">
                ${formatPrice(analytics.monthRevenue)}
              </p>
              <p className="text-sm text-muted-foreground">
                {analytics.monthOrders} {analytics.monthOrders === 1 ? "order" : "orders"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
