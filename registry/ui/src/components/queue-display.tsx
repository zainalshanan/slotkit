import React, { useEffect, useState } from "react";
import { cn } from "../utils/cn.js";

/** A queue entry for display */
export interface QueueDisplayEntry {
  /** Queue entry ID */
  id: string;
  /** Queue position (1-based) */
  position: number;
  /** Customer first name (last name hidden for privacy) */
  customerFirstName: string;
  /** Service name */
  serviceName: string;
  /** Estimated wait in minutes */
  estimatedWaitMinutes: number;
  /** Current status */
  status: "queued" | "in_service";
}

/** Props for the QueueDisplay component */
export interface QueueDisplayProps {
  /** Current queue entries */
  entries: QueueDisplayEntry[];
  /** Whether the provider is accepting walk-ins */
  isAccepting: boolean;
  /** Provider display name */
  providerName?: string;
  /** Callback to refresh queue data */
  onRefresh?: () => Promise<QueueDisplayEntry[]>;
  /** Auto-refresh interval in seconds (default: 30) */
  refreshInterval?: number;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Public-facing auto-refreshing queue display.
 *
 * Shows current queue with positions, service types, and estimated wait times.
 * Designed for wall-mounted displays or customer-facing screens.
 *
 * @example
 * ```tsx
 * <QueueDisplay
 *   entries={queueEntries}
 *   isAccepting={true}
 *   providerName="Downtown Barber Shop"
 *   onRefresh={fetchQueueEntries}
 *   refreshInterval={15}
 * />
 * ```
 */
export function QueueDisplay({
  entries: initialEntries,
  isAccepting,
  providerName,
  onRefresh,
  refreshInterval = 30,
  className,
  style,
}: QueueDisplayProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Sync with prop changes
  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  // Auto-refresh
  useEffect(() => {
    if (!onRefresh || refreshInterval <= 0) return;

    const interval = setInterval(async () => {
      try {
        const updated = await onRefresh();
        setEntries(updated);
        setLastUpdated(new Date());
      } catch {
        // Silently fail on refresh errors
      }
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [onRefresh, refreshInterval]);

  const queuedEntries = entries.filter((e) => e.status === "queued");
  const inService = entries.find((e) => e.status === "in_service");

  return (
    <div className={cn("slotkit-queue-display", className)} style={style}>
      {/* Header */}
      <div className="slotkit-queue-header">
        {providerName && (
          <h2 className="slotkit-queue-title">{providerName}</h2>
        )}
        <div
          className={cn(
            "slotkit-queue-status-indicator",
            isAccepting
              ? "slotkit-queue-accepting"
              : "slotkit-queue-not-accepting",
          )}
        >
          <span
            className="slotkit-queue-status-dot"
            aria-hidden="true"
          />
          {isAccepting ? "Accepting Walk-Ins" : "Not Accepting Walk-Ins"}
        </div>
      </div>

      {/* Now Serving */}
      {inService && (
        <div className="slotkit-queue-now-serving">
          <span className="slotkit-queue-now-label">Now Serving</span>
          <span className="slotkit-queue-now-name">
            {inService.customerFirstName}
          </span>
          <span className="slotkit-queue-now-service">
            {inService.serviceName}
          </span>
        </div>
      )}

      {/* Queue List */}
      {queuedEntries.length > 0 ? (
        <div className="slotkit-queue-list" role="list">
          <div className="slotkit-queue-list-header">
            <span>#</span>
            <span>Customer</span>
            <span>Service</span>
            <span>Est. Wait</span>
          </div>
          {queuedEntries.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "slotkit-queue-list-row",
                entry.estimatedWaitMinutes > 60 && "slotkit-queue-overdue",
              )}
              role="listitem"
            >
              <span className="slotkit-queue-position">{entry.position}</span>
              <span className="slotkit-queue-name">
                {entry.customerFirstName}
              </span>
              <span className="slotkit-queue-service">
                {entry.serviceName}
              </span>
              <span className="slotkit-queue-wait">
                ~{entry.estimatedWaitMinutes} min
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="slotkit-queue-empty">
          {isAccepting
            ? "No one in the queue — walk right in!"
            : "Queue is currently closed."}
        </div>
      )}

      {/* Footer */}
      <div className="slotkit-queue-footer">
        <span className="slotkit-queue-count">
          {queuedEntries.length} in queue
        </span>
        <span className="slotkit-queue-updated">
          Updated {lastUpdated.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
