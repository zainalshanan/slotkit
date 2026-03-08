import React, { useCallback, useState } from "react";
import { cn } from "../utils/cn.js";

/** Walk-in queue entry for provider management */
export interface QueueManagerEntry {
  id: string;
  position: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName: string;
  durationMinutes: number;
  estimatedWaitMinutes: number;
  checkedInAt: Date;
  status: "queued" | "in_service";
  notes?: string;
}

/** Props for the QueueManager component */
export interface QueueManagerProps {
  /** Current queue entries ordered by position */
  entries: QueueManagerEntry[];
  /** Called when provider starts service for an entry */
  onStartService: (entryId: string) => Promise<void>;
  /** Called when provider completes service */
  onCompleteService: (entryId: string) => Promise<void>;
  /** Called when a customer is marked as no-show */
  onMarkNoShow: (entryId: string) => Promise<void>;
  /** Called when an entry is removed from queue */
  onRemove: (entryId: string) => Promise<void>;
  /** Called when entries are reordered (receives ordered entry IDs) */
  onReorder?: (orderedIds: string[]) => Promise<void>;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Provider-facing queue management component.
 *
 * Shows the full walk-in queue with customer details, wait times,
 * and action buttons for managing the service lifecycle. Supports
 * drag-to-reorder for priority changes.
 *
 * @example
 * ```tsx
 * <QueueManager
 *   entries={queueEntries}
 *   onStartService={(id) => api.startService(id)}
 *   onCompleteService={(id) => api.completeService(id)}
 *   onMarkNoShow={(id) => api.markNoShow(id)}
 *   onRemove={(id) => api.removeFromQueue(id)}
 *   onReorder={(ids) => api.reorderQueue(providerId, ids)}
 * />
 * ```
 */
export function QueueManager({
  entries,
  onStartService,
  onCompleteService,
  onMarkNoShow,
  onRemove,
  onReorder,
  className,
  style,
}: QueueManagerProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const withLoading = useCallback(
    (id: string, action: (id: string) => Promise<void>) => async () => {
      setLoadingId(id);
      try {
        await action(id);
      } finally {
        setLoadingId(null);
      }
    },
    [],
  );

  const handleDragStart = (e: React.DragEvent, entryId: string) => {
    e.dataTransfer.setData("text/plain", entryId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, entryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(entryId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!onReorder) return;

    const sourceId = e.dataTransfer.getData("text/plain");
    if (sourceId === targetId) return;

    const queuedEntries = entries.filter((en) => en.status === "queued");
    const ids = queuedEntries.map((en) => en.id);
    const sourceIdx = ids.indexOf(sourceId);
    const targetIdx = ids.indexOf(targetId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    ids.splice(sourceIdx, 1);
    ids.splice(targetIdx, 0, sourceId);

    // Include in-service entries
    const inServiceIds = entries
      .filter((en) => en.status === "in_service")
      .map((en) => en.id);

    await onReorder([...inServiceIds, ...ids]);
  };

  const inService = entries.find((e) => e.status === "in_service");
  const queued = entries.filter((e) => e.status === "queued");

  const isLoading = (id: string) => loadingId === id;

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const getWaitClass = (minutes: number) => {
    if (minutes > 45) return "slotkit-queue-wait-high";
    if (minutes > 20) return "slotkit-queue-wait-medium";
    return "slotkit-queue-wait-low";
  };

  return (
    <div className={cn("slotkit-queue-manager", className)} style={style}>
      <div className="slotkit-queue-manager-header">
        <h2 className="slotkit-form-title">Walk-In Queue</h2>
        <span className="slotkit-badge">{entries.length} total</span>
      </div>

      {/* In-Service Entry */}
      {inService && (
        <div className="slotkit-queue-in-service">
          <div className="slotkit-queue-in-service-label">Now Serving</div>
          <div className="slotkit-queue-card slotkit-queue-card-active">
            <div className="slotkit-queue-card-header">
              <span className="slotkit-queue-card-name">
                {inService.customerName}
              </span>
              <span className="slotkit-queue-card-service">
                {inService.serviceName} ({inService.durationMinutes} min)
              </span>
            </div>
            {(inService.customerPhone || inService.customerEmail) && (
              <div className="slotkit-queue-card-contact">
                {inService.customerPhone && (
                  <span>{inService.customerPhone}</span>
                )}
                {inService.customerEmail && (
                  <span>{inService.customerEmail}</span>
                )}
              </div>
            )}
            {inService.notes && (
              <div className="slotkit-queue-card-notes">{inService.notes}</div>
            )}
            <div className="slotkit-queue-card-actions">
              <button
                type="button"
                className="slotkit-button-primary"
                onClick={withLoading(inService.id, onCompleteService)}
                disabled={isLoading(inService.id)}
              >
                {isLoading(inService.id) ? "..." : "Complete"}
              </button>
              <button
                type="button"
                className="slotkit-button-danger"
                onClick={withLoading(inService.id, onMarkNoShow)}
                disabled={isLoading(inService.id)}
              >
                No-Show
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queued Entries */}
      {queued.length > 0 ? (
        <div className="slotkit-queue-list" role="list">
          {queued.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "slotkit-queue-card",
                dragOverId === entry.id && "slotkit-queue-card-dragover",
              )}
              role="listitem"
              draggable={!!onReorder}
              onDragStart={(e) => handleDragStart(e, entry.id)}
              onDragOver={(e) => handleDragOver(e, entry.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, entry.id)}
            >
              <div className="slotkit-queue-card-header">
                <span className="slotkit-queue-card-position">
                  #{entry.position}
                </span>
                <span className="slotkit-queue-card-name">
                  {entry.customerName}
                </span>
                <span
                  className={cn(
                    "slotkit-queue-card-wait",
                    getWaitClass(entry.estimatedWaitMinutes),
                  )}
                >
                  ~{entry.estimatedWaitMinutes} min
                </span>
              </div>
              <div className="slotkit-queue-card-meta">
                <span>{entry.serviceName} ({entry.durationMinutes} min)</span>
                <span>Checked in {formatTime(entry.checkedInAt)}</span>
              </div>
              {(entry.customerPhone || entry.customerEmail) && (
                <div className="slotkit-queue-card-contact">
                  {entry.customerPhone && <span>{entry.customerPhone}</span>}
                  {entry.customerEmail && <span>{entry.customerEmail}</span>}
                </div>
              )}
              {entry.notes && (
                <div className="slotkit-queue-card-notes">{entry.notes}</div>
              )}
              <div className="slotkit-queue-card-actions">
                <button
                  type="button"
                  className="slotkit-button-primary"
                  onClick={withLoading(entry.id, onStartService)}
                  disabled={isLoading(entry.id) || !!inService}
                  title={
                    inService
                      ? "Complete the current service first"
                      : "Start service"
                  }
                >
                  {isLoading(entry.id) ? "..." : "Start Service"}
                </button>
                <button
                  type="button"
                  className="slotkit-button-secondary"
                  onClick={withLoading(entry.id, onMarkNoShow)}
                  disabled={isLoading(entry.id)}
                >
                  No-Show
                </button>
                <button
                  type="button"
                  className="slotkit-button-danger-outline"
                  onClick={withLoading(entry.id, onRemove)}
                  disabled={isLoading(entry.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !inService && (
          <div className="slotkit-queue-empty">
            No walk-ins in queue.
          </div>
        )
      )}
    </div>
  );
}
