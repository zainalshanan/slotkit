import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addDays,
  subDays,
  startOfToday,
  addMinutes,
} from "date-fns";
import { cn } from "../utils/cn.js";
import { BookingStatusBadge, type BookingStatus } from "./booking-status-badge.js";

const locales = { "en-US": {} };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

/** A booking/event for the kiosk calendar */
export interface KioskEvent {
  id: string;
  title: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  serviceName: string;
  source: "online" | "walk_in" | "phone" | "admin";
  notes?: string;
  priceCents?: number;
  location?: string;
  /** Whether this is a break/block (not a booking) */
  isBlock?: boolean;
  blockType?: "break" | "personal" | "meeting" | "closed";
}

/** Color coding mode */
export type KioskColorMode = "status" | "event_type" | "source";

/** Props for the KioskCalendar component */
export interface KioskCalendarProps {
  /** Events to display */
  events: KioskEvent[];
  /** Default view (day, 3day, week) */
  defaultView?: "day" | "week";
  /** Color coding mode */
  colorMode?: KioskColorMode;
  /** Fields to show on compact blocks */
  showFields?: {
    customerName?: boolean;
    serviceName?: boolean;
    status?: boolean;
    price?: boolean;
    notes?: boolean;
  };
  /** Start hour for day view */
  dayStartHour?: number;
  /** End hour for day view */
  dayEndHour?: number;
  /** Slot height in pixels (controls zoom) */
  slotHeight?: number;
  /** Called when a booking is clicked */
  onEventClick?: (event: KioskEvent) => void;
  /** Called when an empty time slot is double-clicked */
  onSlotDoubleClick?: (start: Date, end: Date) => void;
  /** Called when a booking is dragged to a new time */
  onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => Promise<void>;
  /** Called when a booking is resized */
  onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => Promise<void>;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: "#16a34a",
  pending: "#ca8a04",
  cancelled: "#6b7280",
  no_show: "#dc2626",
  completed: "#2563eb",
  rejected: "#9ca3af",
  rescheduled: "#7c3aed",
};

const SOURCE_COLORS: Record<string, string> = {
  online: "#2563eb",
  walk_in: "#f59e0b",
  phone: "#8b5cf6",
  admin: "#64748b",
};

/**
 * Full-screen interactive kiosk calendar for providers.
 *
 * Google Calendar-style view with drag-and-drop rescheduling,
 * color-coded bookings, current time indicator, and inline
 * booking details. Designed for reception desk tablets and desktops.
 *
 * @example
 * ```tsx
 * <KioskCalendar
 *   events={providerEvents}
 *   defaultView="day"
 *   colorMode="status"
 *   onEventClick={(e) => openDetail(e)}
 *   onSlotDoubleClick={(start, end) => openNewBooking(start, end)}
 *   onEventDrop={async (id, start, end) => {
 *     await rescheduleBooking(id, start, end);
 *   }}
 * />
 * ```
 */
export function KioskCalendar({
  events,
  defaultView = "day",
  colorMode = "status",
  showFields = { customerName: true, serviceName: true, status: true },
  dayStartHour = 6,
  dayEndHour = 22,
  slotHeight = 48,
  onEventClick,
  onSlotDoubleClick,
  onEventDrop,
  onEventResize,
  className,
  style,
}: KioskCalendarProps) {
  const [view, setView] = useState<View>(defaultView);
  const [date, setDate] = useState<Date>(startOfToday());
  const [selectedEvent, setSelectedEvent] = useState<KioskEvent | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current hour on mount
  useEffect(() => {
    const now = new Date();
    const scrollTarget = calendarRef.current?.querySelector(
      ".rbc-current-time-indicator",
    );
    scrollTarget?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedEvent(null);
        return;
      }
      if (e.key === "ArrowLeft") {
        setDate((d) => subDays(d, view === "week" ? 7 : 1));
        return;
      }
      if (e.key === "ArrowRight") {
        setDate((d) => addDays(d, view === "week" ? 7 : 1));
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view]);

  interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: KioskEvent;
  }

  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      events.map((evt) => ({
        id: evt.id,
        title: buildTitle(evt, showFields),
        start: evt.startsAt,
        end: evt.endsAt,
        resource: evt,
      })),
    [events, showFields],
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      setSelectedEvent(event.resource);
      onEventClick?.(event.resource);
    },
    [onEventClick],
  );

  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      onSlotDoubleClick?.(start, end);
    },
    [onSlotDoubleClick],
  );

  const handleEventDrop = useCallback(
    async ({ event, start, end }: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
      if (!onEventDrop) return;
      const s = typeof start === "string" ? new Date(start) : start;
      const e = typeof end === "string" ? new Date(end) : end;
      await onEventDrop(event.id, s, e);
    },
    [onEventDrop],
  );

  const handleEventResize = useCallback(
    async ({ event, start, end }: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
      if (!onEventResize) return;
      const s = typeof start === "string" ? new Date(start) : start;
      const e = typeof end === "string" ? new Date(end) : end;
      await onEventResize(event.id, s, e);
    },
    [onEventResize],
  );

  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const evt = event.resource;

      // Block/break styling
      if (evt.isBlock) {
        return {
          style: {
            backgroundColor: "#f1f5f9",
            border: "2px dashed #94a3b8",
            color: "#475569",
            fontSize: "12px",
            padding: "2px 6px",
            opacity: 0.8,
          },
        };
      }

      // Walk-in styling
      if (evt.source === "walk_in") {
        const color = colorMode === "source" ? SOURCE_COLORS.walk_in : getEventColor(evt, colorMode);
        return {
          style: {
            backgroundColor: color,
            border: "2px dashed rgba(255,255,255,0.5)",
            borderRadius: "4px",
            color: "white",
            fontSize: "12px",
            padding: "2px 6px",
          },
        };
      }

      // Regular booking
      const color = getEventColor(evt, colorMode);
      const isDraggable = !["completed", "cancelled", "no_show", "rejected"].includes(evt.status);

      return {
        style: {
          backgroundColor: color,
          border: "none",
          borderRadius: "4px",
          color: "white",
          fontSize: "12px",
          padding: "2px 6px",
          cursor: isDraggable ? "grab" : "default",
          opacity: ["cancelled", "rejected", "no_show"].includes(evt.status) ? 0.5 : 1,
        },
      };
    },
    [colorMode],
  );

  const handleNavigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setDate(startOfToday());
    } else if (direction === "prev") {
      setDate((d) => subDays(d, view === "week" ? 7 : 1));
    } else {
      setDate((d) => addDays(d, view === "week" ? 7 : 1));
    }
  };

  return (
    <div
      ref={calendarRef}
      className={cn("slotkit-kiosk-calendar", className)}
      style={style}
    >
      {/* Toolbar */}
      <div className="slotkit-kiosk-toolbar">
        <div className="slotkit-kiosk-nav">
          <button
            type="button"
            className="slotkit-button-secondary"
            onClick={() => handleNavigate("prev")}
            aria-label="Previous"
          >
            &lsaquo;
          </button>
          <button
            type="button"
            className="slotkit-button-secondary"
            onClick={() => handleNavigate("today")}
          >
            Today
          </button>
          <button
            type="button"
            className="slotkit-button-secondary"
            onClick={() => handleNavigate("next")}
            aria-label="Next"
          >
            &rsaquo;
          </button>
        </div>

        <h2 className="slotkit-kiosk-date">
          {format(date, view === "week" ? "MMM d, yyyy" : "EEEE, MMM d, yyyy")}
        </h2>

        <div className="slotkit-kiosk-view-switcher">
          {(["day", "week"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              className={cn(
                "slotkit-button-secondary",
                view === v && "slotkit-button-active",
              )}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <Calendar<CalendarEvent>
        localizer={localizer}
        events={calendarEvents}
        view={view}
        date={date}
        onView={setView}
        onNavigate={setDate}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        eventPropGetter={eventStyleGetter}
        toolbar={false}
        selectable
        step={15}
        timeslots={4}
        min={new Date(1970, 0, 1, dayStartHour, 0, 0)}
        max={new Date(1970, 0, 1, dayEndHour, 0, 0)}
        style={{ height: "calc(100vh - 120px)" }}
        showCurrentTimeIndicator
      />

      {/* Event Detail Popover */}
      {selectedEvent && (
        <div
          className="slotkit-kiosk-popover"
          role="dialog"
          aria-label="Event details"
        >
          <button
            type="button"
            className="slotkit-popover-close"
            onClick={() => setSelectedEvent(null)}
            aria-label="Close"
          >
            &times;
          </button>

          {selectedEvent.isBlock ? (
            <>
              <h3>{selectedEvent.title}</h3>
              <p className="slotkit-kiosk-popover-type">
                {selectedEvent.blockType ?? "Block"}
              </p>
              <dl className="slotkit-detail-list">
                <dt>Time</dt>
                <dd>
                  {formatTime(selectedEvent.startsAt)} &ndash;{" "}
                  {formatTime(selectedEvent.endsAt)}
                </dd>
              </dl>
            </>
          ) : (
            <>
              <BookingStatusBadge status={selectedEvent.status} />
              <h3>{selectedEvent.serviceName}</h3>
              <dl className="slotkit-detail-list">
                <dt>Customer</dt>
                <dd>{selectedEvent.customerName}</dd>
                {selectedEvent.customerEmail && (
                  <>
                    <dt>Email</dt>
                    <dd>{selectedEvent.customerEmail}</dd>
                  </>
                )}
                {selectedEvent.customerPhone && (
                  <>
                    <dt>Phone</dt>
                    <dd>{selectedEvent.customerPhone}</dd>
                  </>
                )}
                <dt>Time</dt>
                <dd>
                  {formatTime(selectedEvent.startsAt)} &ndash;{" "}
                  {formatTime(selectedEvent.endsAt)}
                </dd>
                <dt>Source</dt>
                <dd>{selectedEvent.source.replace("_", " ")}</dd>
                {selectedEvent.priceCents != null &&
                  selectedEvent.priceCents > 0 && (
                    <>
                      <dt>Price</dt>
                      <dd>${(selectedEvent.priceCents / 100).toFixed(2)}</dd>
                    </>
                  )}
                {selectedEvent.location && (
                  <>
                    <dt>Location</dt>
                    <dd>{selectedEvent.location}</dd>
                  </>
                )}
                {selectedEvent.notes && (
                  <>
                    <dt>Notes</dt>
                    <dd>{selectedEvent.notes}</dd>
                  </>
                )}
              </dl>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTitle(
  event: KioskEvent,
  fields: KioskCalendarProps["showFields"],
): string {
  if (event.isBlock) return event.title;
  const parts: string[] = [];
  if (fields?.customerName !== false) parts.push(event.customerName);
  if (fields?.serviceName !== false) parts.push(event.serviceName);
  return parts.join(" — ") || event.title;
}

function getEventColor(event: KioskEvent, mode: KioskColorMode): string {
  if (mode === "source") return SOURCE_COLORS[event.source] ?? "#6b7280";
  return STATUS_COLORS[event.status] ?? "#6b7280";
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
