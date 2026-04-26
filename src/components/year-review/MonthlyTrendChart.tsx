import React from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendPoint } from '../../domain/finance';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui';

export function MonthlyTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <Card className="p-4">
      <p className="text-micro font-bold text-on-surface-variant mb-3">Monthly trend</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--color-on-surface-variant)' }} />
            <YAxis hide />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 16, border: 'none' }} />
            <Bar dataKey="income" fill="var(--color-secondary)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="expenses" fill="var(--color-tertiary)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
