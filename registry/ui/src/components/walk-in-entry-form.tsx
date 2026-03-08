import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { cn } from "../utils/cn.js";

/** A provider currently accepting walk-ins */
export interface WalkInProvider {
  id: string;
  displayName: string;
  acceptingWalkIns: boolean;
}

/** A walk-in-enabled event type / service */
export interface WalkInEventType {
  id: string;
  title: string;
  durationMinutes: number;
  priceCents?: number;
  currency?: string;
}

/** Values submitted by the walk-in entry form */
export interface WalkInEntryFormValues {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  eventTypeId: string;
  providerId: string;
  notes?: string;
}

/** Result returned after adding a walk-in */
export interface WalkInEntryResult {
  queuePosition: number;
  estimatedWaitMinutes: number;
}

/** Props for the WalkInEntryForm component */
export interface WalkInEntryFormProps {
  /** Walk-in-enabled event types */
  eventTypes: WalkInEventType[];
  /** Providers currently accepting walk-ins */
  providers: WalkInProvider[];
  /** Called when form is submitted */
  onSubmit: (values: WalkInEntryFormValues) => Promise<WalkInEntryResult>;
  /** Called when form is cancelled */
  onCancel?: () => void;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

const RECENT_CUSTOMERS_KEY = "slotkit-recent-walkins";
const MAX_RECENT = 10;

/**
 * Compact form for adding walk-in customers to the queue.
 *
 * Designed for quick entry by receptionists. Remembers recent customer
 * names in localStorage for fast re-entry. Shows estimated wait time
 * on successful submission.
 *
 * @example
 * ```tsx
 * <WalkInEntryForm
 *   eventTypes={walkInServices}
 *   providers={activeProviders}
 *   onSubmit={async (values) => {
 *     const result = await addWalkIn(values);
 *     return { queuePosition: result.position, estimatedWaitMinutes: result.wait };
 *   }}
 * />
 * ```
 */
export function WalkInEntryForm({
  eventTypes,
  providers,
  onSubmit,
  onCancel,
  className,
  style,
}: WalkInEntryFormProps) {
  const [result, setResult] = useState<WalkInEntryResult | null>(null);
  const [recentNames, setRecentNames] = useState<string[]>([]);

  const acceptingProviders = providers.filter((p) => p.acceptingWalkIns);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<WalkInEntryFormValues>({
    defaultValues: {
      eventTypeId: eventTypes[0]?.id ?? "",
      providerId: acceptingProviders[0]?.id ?? "",
    },
  });

  // Load recent customers from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_CUSTOMERS_KEY);
      if (stored) setRecentNames(JSON.parse(stored));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const saveRecentName = (name: string) => {
    try {
      const updated = [name, ...recentNames.filter((n) => n !== name)].slice(
        0,
        MAX_RECENT,
      );
      setRecentNames(updated);
      localStorage.setItem(RECENT_CUSTOMERS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  };

  const selectedEventTypeId = watch("eventTypeId");
  const selectedEventType = eventTypes.find(
    (et) => et.id === selectedEventTypeId,
  );

  const handleFormSubmit = async (values: WalkInEntryFormValues) => {
    // Validate provider is accepting
    const provider = providers.find((p) => p.id === values.providerId);
    if (!provider?.acceptingWalkIns) {
      setError("providerId", {
        message: "This provider is not currently accepting walk-ins.",
      });
      return;
    }

    try {
      const res = await onSubmit(values);
      saveRecentName(values.customerName);
      setResult(res);
    } catch (err) {
      setError("root", {
        message:
          err instanceof Error ? err.message : "Failed to add walk-in.",
      });
    }
  };

  const handleAddAnother = () => {
    setResult(null);
    reset();
  };

  // Show success state
  if (result) {
    return (
      <div className={cn("slotkit-walkin-success", className)} style={style}>
        <div className="slotkit-walkin-success-icon" aria-hidden="true">
          &#10003;
        </div>
        <h3 className="slotkit-walkin-success-title">Added to Queue</h3>
        <dl className="slotkit-detail-list">
          <dt>Position</dt>
          <dd>#{result.queuePosition}</dd>
          <dt>Estimated Wait</dt>
          <dd>
            {result.estimatedWaitMinutes === 0
              ? "No wait — next up!"
              : `~${result.estimatedWaitMinutes} min`}
          </dd>
        </dl>
        <div className="slotkit-form-actions">
          <button
            type="button"
            className="slotkit-button-primary"
            onClick={handleAddAnother}
          >
            Add Another
          </button>
          {onCancel && (
            <button
              type="button"
              className="slotkit-button-secondary"
              onClick={onCancel}
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      className={cn("slotkit-walkin-entry-form", className)}
      style={style}
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
    >
      <h2 className="slotkit-form-title">Add Walk-In</h2>

      {/* Customer Name */}
      <div className="slotkit-field">
        <label htmlFor="wi-name" className="slotkit-label">
          Customer Name <span aria-hidden="true">*</span>
        </label>
        <input
          id="wi-name"
          type="text"
          className="slotkit-input"
          placeholder="Customer name"
          list="wi-recent-names"
          autoFocus
          {...register("customerName", {
            required: "Customer name is required",
          })}
        />
        {recentNames.length > 0 && (
          <datalist id="wi-recent-names">
            {recentNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}
        {errors.customerName ? (
          <p className="slotkit-error">{errors.customerName.message}</p>
        ) : null}
      </div>

      {/* Phone or Email (optional) */}
      <div className="slotkit-field-row">
        <div className="slotkit-field">
          <label htmlFor="wi-phone" className="slotkit-label">
            Phone
          </label>
          <input
            id="wi-phone"
            type="tel"
            className="slotkit-input"
            placeholder="+1 555 000 0000"
            {...register("customerPhone")}
          />
        </div>
        <div className="slotkit-field">
          <label htmlFor="wi-email" className="slotkit-label">
            Email
          </label>
          <input
            id="wi-email"
            type="email"
            className="slotkit-input"
            placeholder="email@example.com"
            {...register("customerEmail")}
          />
        </div>
      </div>

      {/* Service Selector */}
      <div className="slotkit-field">
        <label htmlFor="wi-service" className="slotkit-label">
          Service <span aria-hidden="true">*</span>
        </label>
        <select
          id="wi-service"
          className="slotkit-select"
          {...register("eventTypeId", { required: "Please select a service" })}
        >
          {eventTypes.map((et) => (
            <option key={et.id} value={et.id}>
              {et.title} ({et.durationMinutes} min)
            </option>
          ))}
        </select>
        {selectedEventType?.priceCents != null &&
          selectedEventType.priceCents > 0 && (
            <p className="slotkit-field-hint">
              Price:{" "}
              {formatPrice(
                selectedEventType.priceCents,
                selectedEventType.currency,
              )}
            </p>
          )}
        {errors.eventTypeId ? (
          <p className="slotkit-error">{errors.eventTypeId.message}</p>
        ) : null}
      </div>

      {/* Provider Selector (only if multiple) */}
      {acceptingProviders.length > 1 && (
        <div className="slotkit-field">
          <label htmlFor="wi-provider" className="slotkit-label">
            Provider <span aria-hidden="true">*</span>
          </label>
          <select
            id="wi-provider"
            className="slotkit-select"
            {...register("providerId", {
              required: "Please select a provider",
            })}
          >
            {acceptingProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
          {errors.providerId ? (
            <p className="slotkit-error">{errors.providerId.message}</p>
          ) : null}
        </div>
      )}

      {/* Notes */}
      <div className="slotkit-field">
        <label htmlFor="wi-notes" className="slotkit-label">
          Notes
        </label>
        <textarea
          id="wi-notes"
          className="slotkit-textarea"
          rows={2}
          placeholder="Optional notes..."
          {...register("notes")}
        />
      </div>

      {errors.root ? (
        <div className="slotkit-alert slotkit-alert-error" role="alert">
          {errors.root.message}
        </div>
      ) : null}

      <div className="slotkit-form-actions">
        <button
          type="submit"
          className="slotkit-button-primary"
          disabled={isSubmitting || acceptingProviders.length === 0}
        >
          {isSubmitting ? "Adding..." : "Add to Queue"}
        </button>
        {onCancel && (
          <button
            type="button"
            className="slotkit-button-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>

      {acceptingProviders.length === 0 && (
        <p className="slotkit-alert slotkit-alert-warning">
          No providers are currently accepting walk-ins.
        </p>
      )}
    </form>
  );
}

/** Format cents to a display price */
function formatPrice(cents: number, currency?: string): string {
  const amount = (cents / 100).toFixed(2);
  const symbol = currency === "GBP" ? "\u00A3" : currency === "EUR" ? "\u20AC" : "$";
  return `${symbol}${amount}`;
}
