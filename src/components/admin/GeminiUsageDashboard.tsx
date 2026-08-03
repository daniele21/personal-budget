/**
 * GeminiUsageDashboard — Admin panel section for monitoring Gemini API usage.
 *
 * Displays:
 * - Cumulative cost and total tokens
 * - Per-model breakdown
 * - Per-user breakdown (who triggered calls)
 * - Recent usage log with timestamp, model, tokens, cost
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Loader2,
  RefreshCw,
  DollarSign,
  Zap,
  Users,
  BarChart3,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getUsageRecords, type ParsedUsageRecord } from '../../lib/geminiUsage';
import { getModelInfo } from '../../config/gemini';

export function GeminiUsageDashboard() {
  const [records, setRecords] = useState<ParsedUsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /** Fetch usage records from Firestore */
  const fetchRecords = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getUsageRecords(200);
      setRecords(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  /** Aggregated statistics */
  const stats = useMemo(() => {
    const totalInputTokens = records.reduce((s, r) => s + r.inputTokens, 0);
    const totalOutputTokens = records.reduce((s, r) => s + r.outputTokens, 0);
    const totalCost = records.reduce((s, r) => s + r.estimatedCostUsd, 0);

    // Per-model breakdown
    const byModel = new Map<string, { calls: number; inputTokens: number; outputTokens: number; cost: number }>();
    records.forEach((r) => {
      const existing = byModel.get(r.modelId) || { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
      existing.calls += 1;
      existing.inputTokens += r.inputTokens;
      existing.outputTokens += r.outputTokens;
      existing.cost += r.estimatedCostUsd;
      byModel.set(r.modelId, existing);
    });

    // Per-user breakdown
    const byUser = new Map<string, { calls: number; inputTokens: number; outputTokens: number; cost: number }>();
    records.forEach((r) => {
      const key = r.userEmail || 'unknown';
      const existing = byUser.get(key) || { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
      existing.calls += 1;
      existing.inputTokens += r.inputTokens;
      existing.outputTokens += r.outputTokens;
      existing.cost += r.estimatedCostUsd;
      byUser.set(key, existing);
    });

    return {
      totalCalls: records.length,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      byModel: Array.from(byModel.entries()).sort((a, b) => b[1].cost - a[1].cost),
      byUser: Array.from(byUser.entries()).sort((a, b) => b[1].cost - a[1].cost),
    };
  }, [records]);

  /** Format token count for display */
  const formatTokens = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : String(n);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-amber/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-accent-amber" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">AI monitoring</h2>
            <p className="text-xs text-on-surface-variant">Cumulative Gemini usage and cost</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchRecords(true)}
          disabled={refreshing}
          className="p-2 rounded-xl hover:bg-surface-container-high transition-colors text-on-surface-variant"
          aria-label="Refresh"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* ── Summary cards ─────────────────────────────────────── */}
      {records.length === 0 ? (
        <div className="text-center py-8 text-on-surface-variant/50 text-sm">
          No usage data recorded yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard
              icon={<DollarSign className="w-4 h-4" />}
              label="Total cost"
              value={`$${stats.totalCost.toFixed(4)}`}
              accent="text-accent-amber"
              bgAccent="bg-accent-amber/10"
            />
            <SummaryCard
              icon={<Zap className="w-4 h-4" />}
              label="Total tokens"
              value={formatTokens(stats.totalInputTokens + stats.totalOutputTokens)}
              accent="text-primary"
              bgAccent="bg-primary/10"
            />
            <SummaryCard
              icon={<BarChart3 className="w-4 h-4" />}
              label="API calls"
              value={String(stats.totalCalls)}
              accent="text-secondary"
              bgAccent="bg-secondary/10"
            />
          </div>

          {/* Token breakdown */}
          <div className="bg-surface-container-low rounded-2xl p-4 space-y-2">
            <p className="text-micro font-bold text-on-surface-variant">Token breakdown</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-micro text-on-surface-variant">Input</p>
                <p className="text-sm font-bold text-on-surface">{formatTokens(stats.totalInputTokens)}</p>
              </div>
              <div>
                <p className="text-micro text-on-surface-variant">Output</p>
                <p className="text-sm font-bold text-on-surface">{formatTokens(stats.totalOutputTokens)}</p>
              </div>
            </div>
          </div>

          {/* ── Per-model breakdown ──────────────────────────────── */}
          {stats.byModel.length > 0 && (
            <div className="space-y-2">
              <p className="text-micro font-bold text-on-surface-variant px-1">By model</p>
              <div className="space-y-2">
                {stats.byModel.map(([modelId, data]) => {
                  const model = getModelInfo(modelId);
                  return (
                    <div key={modelId} className="bg-surface-container-low rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-on-surface">{model.name}</p>
                        <span className="text-micro font-bold text-accent-amber">${data.cost.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-micro text-on-surface-variant">
                        <span>{data.calls} calls</span>
                        <span>In: {formatTokens(data.inputTokens)}</span>
                        <span>Out: {formatTokens(data.outputTokens)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Per-user breakdown ───────────────────────────────── */}
          {stats.byUser.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Users className="w-3.5 h-3.5 text-on-surface-variant" />
                <p className="text-micro font-bold text-on-surface-variant">By account</p>
              </div>
              <div className="space-y-2">
                {stats.byUser.map(([email, data]) => (
                  <div key={email} className="bg-surface-container-low rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-on-surface truncate">{email}</p>
                      <span className="text-micro font-bold text-accent-amber flex-shrink-0">${data.cost.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-micro text-on-surface-variant">
                      <span>{data.calls} calls</span>
                      <span>{formatTokens(data.inputTokens + data.outputTokens)} token</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent calls log ─────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-micro font-bold text-on-surface-variant px-1">
              Latest calls ({Math.min(records.length, 20)})
            </p>
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto overscroll-contain pr-1 -mr-1">
              {records.slice(0, 20).map((r) => (
                <div
                  key={r.id}
                  className="bg-surface-container-low rounded-xl px-3 py-2.5 flex items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-on-surface truncate">
                        {getModelInfo(r.modelId).name}
                      </p>
                      <span className="text-micro text-on-surface-variant flex-shrink-0">
                        {r.feature}
                      </span>
                    </div>
                    <p className="text-micro text-on-surface-variant truncate">
                      {r.userEmail} · {r.createdAt.toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-micro font-bold text-accent-amber">${r.estimatedCostUsd.toFixed(5)}</p>
                    <p className="text-micro text-on-surface-variant">
                      {formatTokens(r.inputTokens + r.outputTokens)} tok
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Helper component ───────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  accent,
  bgAccent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  bgAccent: string;
}) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-3 text-center">
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2', bgAccent, accent)}>
        {icon}
      </div>
      <p className="text-lg font-headline font-extrabold text-on-surface">{value}</p>
      <p className="text-micro text-on-surface-variant mt-0.5">{label}</p>
    </div>
  );
}
