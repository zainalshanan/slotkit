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
        "slotkit-walkin-toggle",
        isAccepting && "slotkit-walkin-toggle-on",
        !isWithinHours && "slotkit-walkin-toggle-disabled",
        className,
      )}
      style={style}
    >
      <div className="slotkit-walkin-toggle-content">
        <div className="slotkit-walkin-toggle-info">
          <span className="slotkit-walkin-toggle-label">
            Walk-Ins
          </span>
          <span
            className={cn(
              "slotkit-walkin-toggle-status",
              isAccepting
                ? "slotkit-walkin-status-on"
                : "slotkit-walkin-status-off",
            )}
          >
            {isAccepting ? "Accepting" : "Not Accepting"}
          </span>
          {!isWithinHours && (
            <span className="slotkit-walkin-toggle-hint">
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
            "slotkit-toggle-switch",
            isAccepting && "slotkit-toggle-switch-on",
          )}
          onClick={handleToggle}
          disabled={isLoading || !isWithinHours}
        >
          <span className="slotkit-toggle-thumb" />
        </button>
      </div>

      {isAccepting && queueCount > 0 && (
        <div className="slotkit-walkin-toggle-queue">
          <span className="slotkit-badge">
            {queueCount} in queue
          </span>
        </div>
      )}
    </div>
  );
}
