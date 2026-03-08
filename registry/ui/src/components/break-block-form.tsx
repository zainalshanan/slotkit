import React from "react";
import { useForm } from "react-hook-form";
import { cn } from "../utils/cn.js";

/** Block type options */
export type BlockType = "break" | "personal" | "meeting" | "closed";

/** Values submitted by the break/block form */
export interface BreakBlockFormValues {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  blockType: BlockType;
  recurring: boolean;
}

/** Props for the BreakBlockForm component */
export interface BreakBlockFormProps {
  /** Called when the form is submitted */
  onSubmit: (values: BreakBlockFormValues) => Promise<void>;
  /** Called when the form is cancelled */
  onCancel?: () => void;
  /** Pre-filled values (e.g., from clicking an empty slot) */
  defaultValues?: Partial<BreakBlockFormValues>;
  /** Whether there are conflicting bookings (shown as warning) */
  conflictWarning?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  break: "Break",
  personal: "Personal Time",
  meeting: "Staff Meeting",
  closed: "Closed",
};

/**
 * Quick-add form for creating breaks and non-working time blocks.
 *
 * Used within the kiosk calendar to block out lunch breaks, personal time,
 * or unexpected closures. Breaks are stored as availability overrides.
 *
 * @example
 * ```tsx
 * <BreakBlockForm
 *   defaultValues={{ date: "2026-03-10", startTime: "12:00", endTime: "13:00" }}
 *   onSubmit={async (values) => {
 *     await createBreak(values);
 *     toast.success("Break added");
 *   }}
 *   onCancel={() => setShowForm(false)}
 * />
 * ```
 */
export function BreakBlockForm({
  onSubmit,
  onCancel,
  defaultValues,
  conflictWarning,
  className,
  style,
}: BreakBlockFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<BreakBlockFormValues>({
    defaultValues: {
      title: "",
      blockType: "break",
      recurring: false,
      ...defaultValues,
    },
  });

  const handleFormSubmit = async (values: BreakBlockFormValues) => {
    // Validate end > start
    if (values.endTime <= values.startTime) {
      setError("endTime", { message: "End time must be after start time" });
      return;
    }

    try {
      await onSubmit(values);
    } catch (err) {
      setError("root", {
        message:
          err instanceof Error ? err.message : "Failed to create block.",
      });
    }
  };

  return (
    <form
      className={cn("tbk-break-form", className)}
      style={style}
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
    >
      <h2 className="tbk-form-title">Add Break / Block</h2>

      {/* Title */}
      <div className="tbk-field">
        <label htmlFor="bb-title" className="tbk-label">
          Title
        </label>
        <input
          id="bb-title"
          type="text"
          className="tbk-input"
          placeholder="Lunch Break"
          {...register("title", { required: "Title is required" })}
        />
        {errors.title ? (
          <p className="tbk-error">{errors.title.message}</p>
        ) : null}
      </div>

      {/* Block Type */}
      <div className="tbk-field">
        <label htmlFor="bb-type" className="tbk-label">
          Type
        </label>
        <select
          id="bb-type"
          className="tbk-select"
          {...register("blockType")}
        >
          {(Object.entries(BLOCK_TYPE_LABELS) as [BlockType, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
      </div>

      {/* Date */}
      <div className="tbk-field">
        <label htmlFor="bb-date" className="tbk-label">
          Date <span aria-hidden="true">*</span>
        </label>
        <input
          id="bb-date"
          type="date"
          className="tbk-input"
          {...register("date", { required: "Date is required" })}
        />
        {errors.date ? (
          <p className="tbk-error">{errors.date.message}</p>
        ) : null}
      </div>

      {/* Time Range */}
      <div className="tbk-field-row">
        <div className="tbk-field">
          <label htmlFor="bb-start" className="tbk-label">
            Start <span aria-hidden="true">*</span>
          </label>
          <input
            id="bb-start"
            type="time"
            className="tbk-input"
            {...register("startTime", { required: "Start time is required" })}
          />
          {errors.startTime ? (
            <p className="tbk-error">{errors.startTime.message}</p>
          ) : null}
        </div>
        <div className="tbk-field">
          <label htmlFor="bb-end" className="tbk-label">
            End <span aria-hidden="true">*</span>
          </label>
          <input
            id="bb-end"
            type="time"
            className="tbk-input"
            {...register("endTime", { required: "End time is required" })}
          />
          {errors.endTime ? (
            <p className="tbk-error">{errors.endTime.message}</p>
          ) : null}
        </div>
      </div>

      {/* Recurring */}
      <div className="tbk-field">
        <label className="tbk-checkbox-label">
          <input type="checkbox" {...register("recurring")} />
          Repeat daily for the rest of the week
        </label>
      </div>

      {/* Conflict Warning */}
      {conflictWarning && (
        <div className="tbk-alert tbk-alert-warning" role="alert">
          {conflictWarning}
        </div>
      )}

      {errors.root ? (
        <div className="tbk-alert tbk-alert-error" role="alert">
          {errors.root.message}
        </div>
      ) : null}

      <div className="tbk-form-actions">
        <button
          type="submit"
          className="tbk-button-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Adding..." : "Add Block"}
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

      {/* Quick Actions */}
      <div className="tbk-break-quick-actions">
        <button
          type="button"
          className="tbk-button-secondary tbk-button-small"
          onClick={() => {
            const now = new Date();
            const todayStr = now.toISOString().split("T")[0];
            onSubmit({
              title: "Closed for the day",
              date: todayStr,
              startTime: now.toTimeString().slice(0, 5),
              endTime: "23:59",
              blockType: "closed",
              recurring: false,
            });
          }}
        >
          Block rest of day
        </button>
      </div>
    </form>
  );
}
