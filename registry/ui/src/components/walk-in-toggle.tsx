import React, { useCallback, useState } from "react";
import { cn } from "../utils/cn.js";

/** Props for the WalkInToggle component */
export interface WalkInToggleProps {
  /** Whether the provider is currently accepting walk-ins */
  isAccepting: boolean;
  /** Whether the provider is within working hours */
  isWithinHours?: boolean;
  /** Number of walk-ins currently in queue */
  queueCount?: number;
  /** Called when the toggle is switched */
  onToggle: (accepting: boolean) => Promise<void>;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Prominent on/off toggle for walk-in acceptance.
 *
 * Shows the current walk-in status with a large toggle switch.
 * Disables when outside working hours and shows queue count.
 *
 * @example
 * ```tsx
 * <WalkInToggle
 *   isAccepting={provider.acceptingWalkIns}
 *   isWithinHours={true}
 *   queueCount={3}
 *   onToggle={async (accepting) => {
 *     await api.toggleWalkIns(provider.id, accepting);
 *   }}
 * />
 * ```
 */
export function WalkInToggle({
  isAccepting,
  isWithinHours = true,
  queueCount = 0,
  onToggle,
  className,
  style,
}: WalkInToggleProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onToggle(!isAccepting);
    } finally {
      setIsLoading(false);
    }
  }, [isAccepting, isLoading, onToggle]);

  return (
    <div
      className={cn(
        "tbk-walkin-toggle",
        isAccepting && "tbk-walkin-toggle-on",
        !isWithinHours && "tbk-walkin-toggle-disabled",
        className,
      )}
      style={style}
    >
      <div className="tbk-walkin-toggle-content">
        <div className="tbk-walkin-toggle-info">
          <span className="tbk-walkin-toggle-label">
            Walk-Ins
          </span>
          <span
            className={cn(
              "tbk-walkin-toggle-status",
              isAccepting
                ? "tbk-walkin-status-on"
                : "tbk-walkin-status-off",
            )}
          >
            {isAccepting ? "Accepting" : "Not Accepting"}
          </span>
          {!isWithinHours && (
            <span className="tbk-walkin-toggle-hint">
              Outside working hours
            </span>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isAccepting}
          aria-label={
            isAccepting
              ? "Stop accepting walk-ins"
              : "Start accepting walk-ins"
          }
          className={cn(
            "tbk-toggle-switch",
            isAccepting && "tbk-toggle-switch-on",
          )}
          onClick={handleToggle}
          disabled={isLoading || !isWithinHours}
        >
          <span className="tbk-toggle-thumb" />
        </button>
      </div>

      {isAccepting && queueCount > 0 && (
        <div className="tbk-walkin-toggle-queue">
          <span className="tbk-badge">
            {queueCount} in queue
          </span>
        </div>
      )}
    </div>
  );
}
