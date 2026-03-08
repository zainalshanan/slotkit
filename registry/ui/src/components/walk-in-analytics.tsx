import React from "react";
import { cn } from "../utils/cn.js";

/** Walk-in analytics data */
export interface WalkInAnalyticsData {
  totalWalkIns: number;
  averageWaitMinutes: number;
  noShowCount: number;
  noShowRate: number;
  completedCount: number;
  cancelledCount: number;
  hourlyDistribution: Record<number, number>;
  dailyDistribution: Record<number, number>;
  walkInRatio: number;
  averageServiceDuration: number;
}

/** Props for the WalkInAnalytics component */
export interface WalkInAnalyticsProps {
  /** Computed analytics data */
  data: WalkInAnalyticsData;
  /** Total bookings (all sources) for the same period */
  totalBookings: number;
  /** Date range label (e.g., "Last 7 days") */
  dateRangeLabel?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

const DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

/**
 * Walk-in analytics summary with metrics and distribution charts.
 *
 * Shows key walk-in KPIs (total, wait time, no-show rate) alongside
 * hourly and daily distribution bar charts.
 *
 * @example
 * ```tsx
 * <WalkInAnalytics
 *   data={analyticsData}
 *   totalBookings={150}
 *   dateRangeLabel="Last 30 days"
 * />
 * ```
 */
export function WalkInAnalytics({
  data,
  totalBookings,
  dateRangeLabel = "Selected period",
  className,
  style,
}: WalkInAnalyticsProps) {
  const scheduledBookings = totalBookings - data.totalWalkIns;

  return (
    <div className={cn("slotkit-walkin-analytics", className)} style={style}>
      <div className="slotkit-analytics-header">
        <h2 className="slotkit-form-title">Walk-In Analytics</h2>
        <span className="slotkit-analytics-period">{dateRangeLabel}</span>
      </div>

      {/* KPI Cards */}
      <div className="slotkit-analytics-cards">
        <div className="slotkit-analytics-card">
          <span className="slotkit-analytics-card-value">
            {data.totalWalkIns}
          </span>
          <span className="slotkit-analytics-card-label">Total Walk-Ins</span>
        </div>
        <div className="slotkit-analytics-card">
          <span className="slotkit-analytics-card-value">
            {data.averageWaitMinutes} min
          </span>
          <span className="slotkit-analytics-card-label">Avg Wait Time</span>
        </div>
        <div className="slotkit-analytics-card">
          <span className="slotkit-analytics-card-value">
            {data.averageServiceDuration} min
          </span>
          <span className="slotkit-analytics-card-label">
            Avg Service Duration
          </span>
        </div>
        <div className="slotkit-analytics-card">
          <span className="slotkit-analytics-card-value">
            {(data.noShowRate * 100).toFixed(1)}%
          </span>
          <span className="slotkit-analytics-card-label">No-Show Rate</span>
        </div>
      </div>

      {/* Walk-In vs Scheduled */}
      <div className="slotkit-analytics-section">
        <h3 className="slotkit-section-title">Walk-In vs Scheduled</h3>
        <div className="slotkit-analytics-ratio-bar">
          <div
            className="slotkit-analytics-ratio-walkin"
            style={{
              width: `${data.walkInRatio * 100}%`,
            }}
            title={`Walk-ins: ${data.totalWalkIns}`}
          />
          <div
            className="slotkit-analytics-ratio-scheduled"
            style={{
              width: `${(1 - data.walkInRatio) * 100}%`,
            }}
            title={`Scheduled: ${scheduledBookings}`}
          />
        </div>
        <div className="slotkit-analytics-ratio-legend">
          <span className="slotkit-legend-item">
            <span
              className="slotkit-legend-dot"
              style={{ backgroundColor: "#3b82f6" }}
            />
            Walk-ins ({data.totalWalkIns})
          </span>
          <span className="slotkit-legend-item">
            <span
              className="slotkit-legend-dot"
              style={{ backgroundColor: "#94a3b8" }}
            />
            Scheduled ({scheduledBookings})
          </span>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="slotkit-analytics-section">
        <h3 className="slotkit-section-title">Status Breakdown</h3>
        <div className="slotkit-analytics-status-grid">
          <div className="slotkit-analytics-status-item">
            <span className="slotkit-analytics-status-count">
              {data.completedCount}
            </span>
            <span className="slotkit-analytics-status-label">Completed</span>
          </div>
          <div className="slotkit-analytics-status-item">
            <span className="slotkit-analytics-status-count">
              {data.noShowCount}
            </span>
            <span className="slotkit-analytics-status-label">No-Shows</span>
          </div>
          <div className="slotkit-analytics-status-item">
            <span className="slotkit-analytics-status-count">
              {data.cancelledCount}
            </span>
            <span className="slotkit-analytics-status-label">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="slotkit-analytics-section">
        <h3 className="slotkit-section-title">Busiest Hours</h3>
        <div className="slotkit-analytics-chart">
          {renderHourlyChart(data.hourlyDistribution)}
        </div>
      </div>

      {/* Daily Distribution */}
      <div className="slotkit-analytics-section">
        <h3 className="slotkit-section-title">Busiest Days</h3>
        <div className="slotkit-analytics-chart">
          {renderDailyChart(data.dailyDistribution)}
        </div>
      </div>
    </div>
  );
}

function renderHourlyChart(distribution: Record<number, number>) {
  const max = Math.max(1, ...Object.values(distribution));
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Only show hours 6-22 for readability
  const displayHours = hours.filter((h) => h >= 6 && h <= 22);

  return (
    <div className="slotkit-bar-chart" role="img" aria-label="Hourly walk-in distribution">
      {displayHours.map((hour) => {
        const count = distribution[hour] ?? 0;
        const height = max > 0 ? (count / max) * 100 : 0;
        return (
          <div key={hour} className="slotkit-bar-column">
            <div
              className="slotkit-bar"
              style={{ height: `${height}%` }}
              title={`${hour}:00 — ${count} walk-ins`}
            />
            <span className="slotkit-bar-label">
              {hour % 3 === 0 ? `${hour}:00` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function renderDailyChart(distribution: Record<number, number>) {
  const max = Math.max(1, ...Object.values(distribution));
  const days = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="slotkit-bar-chart slotkit-bar-chart-daily" role="img" aria-label="Daily walk-in distribution">
      {days.map((day) => {
        const count = distribution[day] ?? 0;
        const height = max > 0 ? (count / max) * 100 : 0;
        return (
          <div key={day} className="slotkit-bar-column">
            <div
              className="slotkit-bar"
              style={{ height: `${height}%` }}
              title={`${DAY_LABELS[day]} — ${count} walk-ins`}
            />
            <span className="slotkit-bar-label">{DAY_LABELS[day]}</span>
          </div>
        );
      })}
    </div>
  );
}
