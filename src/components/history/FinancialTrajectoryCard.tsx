import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { Card } from '../ui';

interface FinancialTrajectoryCardProps {
  data: Array<{ date: string; balance: number }>;
}

export function FinancialTrajectoryCard({ data }: FinancialTrajectoryCardProps) {
  return (
    <Card as="section">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-on-surface">Financial Trajectory</h3>
        <TrendingUp className="w-4 h-4 text-secondary" />
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" opacity={0.1} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
              minTickGap={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-container-high)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                boxShadow: 'var(--aura-card-shadow)',
              }}
              itemStyle={{ color: 'var(--color-primary)' }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--color-primary)"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorBalance)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
