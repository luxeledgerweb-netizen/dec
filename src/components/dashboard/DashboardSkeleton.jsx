import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardSkeleton() {
  const SkeletonBlock = ({ className }) => <div className={`bg-[var(--border-subtle)]/50 animate-pulse rounded-md ${className}`} />;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Skeleton */}
      <div className="text-center space-y-4">
        <SkeletonBlock className="h-10 w-3/4 mx-auto" />
        <SkeletonBlock className="h-6 w-1/2 mx-auto" />
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <SkeletonBlock className="h-4 w-2/4" />
              <SkeletonBlock className="w-8 h-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <SkeletonBlock className="h-8 w-3/4 mb-2" />
              <SkeletonBlock className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Credit Score & Growth Chart Skeleton */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <SkeletonBlock className="h-6 w-3/4" />
            <SkeletonBlock className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <SkeletonBlock className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <SkeletonBlock className="h-6 w-1/2" />
            <SkeletonBlock className="h-4 w-1/3" />
          </CardHeader>
          <CardContent>
            <SkeletonBlock className="h-56 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Accounts Section Skeleton */}
      <Card className="glass-card">
        <CardHeader>
          <SkeletonBlock className="h-8 w-1/2" />
          <SkeletonBlock className="h-5 w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <SkeletonBlock key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}