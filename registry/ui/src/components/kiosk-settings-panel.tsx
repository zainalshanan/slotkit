import React, { useState } from "react";
import { cn } from "../utils/cn.js";

/** Block density mode */
export type BlockDensity = "compact" | "standard" | "detailed";

/** Color coding mode */
export type ColorCoding = "status" | "event_type" | "source";

/** Kiosk view type */
export type KioskView = "day" | "3day" | "week";

/** Kiosk settings values */
export interface KioskSettingsValues {
  defaultView: KioskView;
  blockDensity: BlockDensity;
  colorCoding: ColorCoding;
  dayStartHour: number;
  dayEndHour: number;
  autoLockMinutes: number;
  showWalkInSidebar: boolean;
  fields: {
    customerName: boolean;
    customerEmail: boolean;
    customerPhone: boolean;
    serviceName: boolean;
    bookingStatus: boolean;
    price: boolean;
    location: boolean;
    notes: boolean;
  };
}

/** Props for the KioskSettingsPanel component */
export interface KioskSettingsPanelProps {
  /** Current settings */
  settings: KioskSettingsValues;
  /** Called when settings are saved */
  onSave: (settings: KioskSettingsValues) => Promise<void>;
  /** Called when the panel is closed */
  onClose: () => void;
  /** Whether the panel is open */
  isOpen: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Slide-out settings panel for configuring the kiosk display.
 *
 * Allows providers to configure which fields appear on calendar blocks,
 * block density, color coding mode, working hours, and auto-lock.
 *
 * @example
 * ```tsx
 * <KioskSettingsPanel
 *   settings={currentSettings}
 *   isOpen={showSettings}
 *   onSave={async (s) => saveKioskSettings(s)}
 *   onClose={() => setShowSettings(false)}
 * />
 * ```
 */
export function KioskSettingsPanel({
  settings: initialSettings,
  onSave,
  onClose,
  isOpen,
  className,
  style,
}: KioskSettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  const update = <K extends keyof KioskSettingsValues>(
    key: K,
    value: KioskSettingsValues[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateField = (field: keyof KioskSettingsValues["fields"], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      fields: { ...prev.fields, [field]: value },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(settings);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn("tbk-kiosk-settings-overlay", className)}
      style={style}
    >
      <div
        className="tbk-kiosk-settings-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="tbk-kiosk-settings-panel"
        role="dialog"
        aria-label="Kiosk settings"
      >
        <div className="tbk-kiosk-settings-header">
          <h2 className="tbk-form-title">Kiosk Settings</h2>
          <button
            type="button"
            className="tbk-popover-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            &times;
          </button>
        </div>

        <div className="tbk-kiosk-settings-body">
          {/* Default View */}
          <div className="tbk-field">
            <label className="tbk-label">Default View</label>
            <div className="tbk-radio-group">
              {(["day", "3day", "week"] as KioskView[]).map((v) => (
                <label key={v} className="tbk-radio-label">
                  <input
                    type="radio"
                    name="defaultView"
                    value={v}
                    checked={settings.defaultView === v}
                    onChange={() => update("defaultView", v)}
                  />
                  {v === "3day" ? "3-Day" : v.charAt(0).toUpperCase() + v.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Block Density */}
          <div className="tbk-field">
            <label className="tbk-label">Block Density</label>
            <select
              className="tbk-select"
              value={settings.blockDensity}
              onChange={(e) =>
                update("blockDensity", e.target.value as BlockDensity)
              }
            >
              <option value="compact">Compact (name + service)</option>
              <option value="standard">Standard (+ status)</option>
              <option value="detailed">Detailed (all fields)</option>
            </select>
          </div>

          {/* Color Coding */}
          <div className="tbk-field">
            <label className="tbk-label">Color Coding</label>
            <select
              className="tbk-select"
              value={settings.colorCoding}
              onChange={(e) =>
                update("colorCoding", e.target.value as ColorCoding)
              }
            >
              <option value="status">By Status</option>
              <option value="event_type">By Service Type</option>
              <option value="source">By Source (online/walk-in/phone)</option>
            </select>
          </div>

          <hr className="tbk-divider" />
          <h3 className="tbk-section-title">Visible Fields</h3>

          {/* Field Toggles */}
          <div className="tbk-checkbox-group">
            {(
              [
                ["customerName", "Customer Name"],
                ["customerEmail", "Customer Email"],
                ["customerPhone", "Customer Phone"],
                ["serviceName", "Service Name"],
                ["bookingStatus", "Booking Status"],
                ["price", "Price"],
                ["location", "Location"],
                ["notes", "Notes"],
              ] as [keyof KioskSettingsValues["fields"], string][]
            ).map(([key, label]) => (
              <label key={key} className="tbk-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.fields[key]}
                  onChange={(e) => updateField(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>

          <hr className="tbk-divider" />
          <h3 className="tbk-section-title">Display Hours</h3>

          <div className="tbk-field-row">
            <div className="tbk-field">
              <label htmlFor="ks-start-hour" className="tbk-label">
                Start Hour
              </label>
              <input
                id="ks-start-hour"
                type="number"
                className="tbk-input"
                min={0}
                max={23}
                value={settings.dayStartHour}
                onChange={(e) =>
                  update("dayStartHour", parseInt(e.target.value, 10))
                }
              />
            </div>
            <div className="tbk-field">
              <label htmlFor="ks-end-hour" className="tbk-label">
                End Hour
              </label>
              <input
                id="ks-end-hour"
                type="number"
                className="tbk-input"
                min={1}
                max={24}
                value={settings.dayEndHour}
                onChange={(e) =>
                  update("dayEndHour", parseInt(e.target.value, 10))
                }
              />
            </div>
          </div>

          <hr className="tbk-divider" />
          <h3 className="tbk-section-title">Security</h3>

          <div className="tbk-field">
            <label htmlFor="ks-autolock" className="tbk-label">
              Auto-lock timeout (minutes, 0 = disabled)
            </label>
            <input
              id="ks-autolock"
              type="number"
              className="tbk-input"
              min={0}
              max={60}
              value={settings.autoLockMinutes}
              onChange={(e) =>
                update("autoLockMinutes", parseInt(e.target.value, 10))
              }
            />
          </div>

          <div className="tbk-field">
            <label className="tbk-checkbox-label">
              <input
                type="checkbox"
                checked={settings.showWalkInSidebar}
                onChange={(e) => update("showWalkInSidebar", e.target.checked)}
              />
              Show walk-in queue sidebar
            </label>
          </div>
        </div>

        <div className="tbk-kiosk-settings-footer">
          <button
            type="button"
            className="tbk-button-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
          <button
            type="button"
            className="tbk-button-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </aside>
    </div>
  );
}
