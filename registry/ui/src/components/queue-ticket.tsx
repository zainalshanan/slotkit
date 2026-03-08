import React from "react";
import { cn } from "../utils/cn.js";

/** Props for the QueueTicket component */
export interface QueueTicketProps {
  /** Queue position */
  position: number;
  /** Customer name */
  customerName: string;
  /** Service name */
  serviceName: string;
  /** Estimated wait in minutes */
  estimatedWaitMinutes: number;
  /** URL to live status page for QR code */
  statusUrl?: string;
  /** Provider/business name */
  providerName?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Queue ticket shown to walk-in customers after joining.
 *
 * Displays queue number, estimated wait, and optionally a QR code
 * linking to a live status page. Designed to be printable or shown
 * on a screen.
 *
 * @example
 * ```tsx
 * <QueueTicket
 *   position={3}
 *   customerName="James"
 *   serviceName="Haircut"
 *   estimatedWaitMinutes={20}
 *   statusUrl="https://shop.example.com/queue/abc123"
 *   providerName="Downtown Barbers"
 * />
 * ```
 */
export function QueueTicket({
  position,
  customerName,
  serviceName,
  estimatedWaitMinutes,
  statusUrl,
  providerName,
  className,
  style,
}: QueueTicketProps) {
  return (
    <div
      className={cn("slotkit-queue-ticket", className)}
      style={style}
      role="region"
      aria-label="Queue ticket"
    >
      {providerName && (
        <div className="slotkit-ticket-provider">{providerName}</div>
      )}

      <div className="slotkit-ticket-number">
        <span className="slotkit-ticket-label">Your Number</span>
        <span className="slotkit-ticket-position">#{position}</span>
      </div>

      <div className="slotkit-ticket-details">
        <div className="slotkit-ticket-row">
          <span className="slotkit-ticket-dt">Name</span>
          <span className="slotkit-ticket-dd">{customerName}</span>
        </div>
        <div className="slotkit-ticket-row">
          <span className="slotkit-ticket-dt">Service</span>
          <span className="slotkit-ticket-dd">{serviceName}</span>
        </div>
        <div className="slotkit-ticket-row">
          <span className="slotkit-ticket-dt">Est. Wait</span>
          <span className="slotkit-ticket-dd">
            {estimatedWaitMinutes === 0
              ? "No wait"
              : `~${estimatedWaitMinutes} min`}
          </span>
        </div>
      </div>

      {statusUrl && (
        <div className="slotkit-ticket-qr">
          <div
            className="slotkit-ticket-qr-placeholder"
            aria-label={`QR code linking to ${statusUrl}`}
            title="Scan to track your position"
          >
            {/*
              QR code rendering is left to the integrator.
              Use a library like `qrcode.react` or `react-qr-code`:
              <QRCodeSVG value={statusUrl} size={120} />
            */}
            <span className="slotkit-ticket-qr-text">QR</span>
          </div>
          <p className="slotkit-ticket-qr-hint">
            Scan to track your position
          </p>
        </div>
      )}
    </div>
  );
}
