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
  /** Pre-select a provider (e.g. from clicking a resource column) */
  defaultProviderId?: string;
  /** Called when the selected service changes — provides duration in minutes */
  onServiceChange?: (serviceId: string, durationMinutes: number) => void;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

const RECENT_CUSTOMERS_KEY = "tbk-recent-walkins";
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
  defaultProviderId,
  onServiceChange,
  className,
  style,
}: WalkInEntryFormProps) {
  const [result, setResult] = useState<WalkInEntryResult | null>(null);
  const [recentNames, setRecentNames] = useState<string[]>([]);

  const acceptingProviders = providers.filter((p) => p.acceptingWalkIns);

  // Use defaultProviderId if it matches an accepting provider, otherwise first available
  const initialProviderId =
    defaultProviderId && acceptingProviders.some((p) => p.id === defaultProviderId)
      ? defaultProviderId
      : acceptingProviders[0]?.id ?? "";

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
      providerId: initialProviderId,
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

  // Notify parent when service selection changes
  useEffect(() => {
    if (selectedEventType && onServiceChange) {
      onServiceChange(selectedEventType.id, selectedEventType.durationMinutes);
    }
  }, [selectedEventTypeId, selectedEventType, onServiceChange]);

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
      <div className={cn("tbk-walkin-success", className)} style={style}>
        <div className="tbk-walkin-success-icon" aria-hidden="true">
          &#10003;
        </div>
        <h3 className="tbk-walkin-success-title">Added to Queue</h3>
        <dl className="tbk-detail-list">
          <dt>Position</dt>
          <dd>#{result.queuePosition}</dd>
          <dt>Estimated Wait</dt>
          <dd>
            {result.estimatedWaitMinutes === 0
              ? "No wait — next up!"
              : `~${result.estimatedWaitMinutes} min`}
          </dd>
        </dl>
        <div className="tbk-form-actions">
          <button
            type="button"
            className="tbk-button-primary"
            onClick={handleAddAnother}
          >
            Add Another
          </button>
          {onCancel && (
            <button
              type="button"
              className="tbk-button-secondary"
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
      className={cn("tbk-walkin-entry-form", className)}
      style={style}
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
    >
      <h2 className="tbk-form-title">Add Walk-In</h2>

      {/* Customer Name */}
      <div className="tbk-field">
        <label htmlFor="wi-name" className="tbk-label">
          Customer Name <span aria-hidden="true">*</span>
        </label>
        <input
          id="wi-name"
          type="text"
          className="tbk-input"
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
          <p className="tbk-error">{errors.customerName.message}</p>
        ) : null}
      </div>

      {/* Phone or Email (optional) */}
      <div className="tbk-field-row">
        <div className="tbk-field">
          <label htmlFor="wi-phone" className="tbk-label">
            Phone
          </label>
          <input
            id="wi-phone"
            type="tel"
            className="tbk-input"
            placeholder="+1 555 000 0000"
            {...register("customerPhone")}
          />
        </div>
        <div className="tbk-field">
          <label htmlFor="wi-email" className="tbk-label">
            Email
          </label>
          <input
            id="wi-email"
            type="email"
            className="tbk-input"
            placeholder="email@example.com"
            {...register("customerEmail")}
          />
        </div>
      </div>

      {/* Service Selector */}
      <div className="tbk-field">
        <label htmlFor="wi-service" className="tbk-label">
          Service <span aria-hidden="true">*</span>
        </label>
        <select
          id="wi-service"
          className="tbk-select"
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
            <p className="tbk-field-hint">
              Price:{" "}
              {formatPrice(
                selectedEventType.priceCents,
                selectedEventType.currency,
              )}
            </p>
          )}
        {errors.eventTypeId ? (
          <p className="tbk-error">{errors.eventTypeId.message}</p>
        ) : null}
      </div>

      {/* Provider Selector (only if multiple) */}
      {acceptingProviders.length > 1 && (
        <div className="tbk-field">
          <label htmlFor="wi-provider" className="tbk-label">
            Provider <span aria-hidden="true">*</span>
          </label>
          <select
            id="wi-provider"
            className="tbk-select"
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
            <p className="tbk-error">{errors.providerId.message}</p>
          ) : null}
        </div>
      )}

      {/* Notes */}
      <div className="tbk-field">
        <label htmlFor="wi-notes" className="tbk-label">
          Notes
        </label>
        <textarea
          id="wi-notes"
          className="tbk-textarea"
          rows={2}
          placeholder="Optional notes..."
          {...register("notes")}
        />
      </div>

      {errors.root ? (
        <div className="tbk-alert tbk-alert-error" role="alert">
          {errors.root.message}
        </div>
      ) : null}

      <div className="tbk-form-actions">
        <button
          type="submit"
          className="tbk-button-primary"
          disabled={isSubmitting || acceptingProviders.length === 0}
        >
          {isSubmitting ? "Adding..." : "Add to Queue"}
        </button>
        {onCancel && (
          <button
            type="button"
            className="tbk-button-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>

      {acceptingProviders.length === 0 && (
        <p className="tbk-alert tbk-alert-warning">
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
