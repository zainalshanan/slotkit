import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn.js";

/** Props for the KioskShell component */
export interface KioskShellProps {
  /** Child content (typically KioskCalendar + QueueManager) */
  children: React.ReactNode;
  /** Auto-lock timeout in minutes (0 = disabled) */
  autoLockMinutes?: number;
  /** PIN for unlocking (empty = no PIN required). Should be the raw PIN for comparison. */
  pin?: string;
  /** Called when fullscreen mode changes */
  onFullscreenChange?: (isFullscreen: boolean) => void;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Full-screen kiosk wrapper with auto-lock and touch-optimized styles.
 *
 * Provides fullscreen toggle, Wake Lock API support, auto-dimming after
 * idle timeout, and PIN-based unlock for unauthorized access prevention.
 * Designed for tablets at reception desks.
 *
 * @example
 * ```tsx
 * <KioskShell autoLockMinutes={5} pin="1234">
 *   <KioskCalendar events={events} />
 * </KioskShell>
 * ```
 */
export function KioskShell({
  children,
  autoLockMinutes = 5,
  pin,
  onFullscreenChange,
  className,
  style,
}: KioskShellProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Reset idle timer on interaction
  const resetIdleTimer = useCallback(() => {
    if (autoLockMinutes <= 0) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, autoLockMinutes * 60 * 1000);
  }, [autoLockMinutes]);

  // Set up idle detection
  useEffect(() => {
    if (autoLockMinutes <= 0) return;

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"];
    const handler = () => resetIdleTimer();

    events.forEach((e) => document.addEventListener(e, handler, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach((e) => document.removeEventListener(e, handler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [autoLockMinutes, resetIdleTimer]);

  // Request Wake Lock
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Wake Lock not supported or denied
      }
    };

    requestWakeLock();

    // Re-acquire on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLockRef.current?.release();
    };
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
        onFullscreenChange?.(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        onFullscreenChange?.(false);
      }
    } catch {
      // Fullscreen not supported
    }
  }, [onFullscreenChange]);

  // F11 handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleFullscreen]);

  // Track fullscreen changes from browser
  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      onFullscreenChange?.(fs);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [onFullscreenChange]);

  // Unlock handler
  const handleUnlock = () => {
    if (!pin || pinInput === pin) {
      setIsLocked(false);
      setPinInput("");
      setPinError(false);
      resetIdleTimer();
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleUnlock();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "slotkit-kiosk-shell",
        isFullscreen && "slotkit-kiosk-fullscreen",
        className,
      )}
      style={style}
    >
      {/* Lock Screen */}
      {isLocked && (
        <div className="slotkit-kiosk-lock-overlay" role="dialog" aria-label="Kiosk locked">
          <div className="slotkit-kiosk-lock-content">
            <div className="slotkit-kiosk-lock-icon" aria-hidden="true">
              &#128274;
            </div>
            <h2 className="slotkit-kiosk-lock-title">Kiosk Locked</h2>
            {pin ? (
              <>
                <p className="slotkit-kiosk-lock-hint">Enter PIN to unlock</p>
                <div className="slotkit-kiosk-pin-input">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value.replace(/\D/g, ""));
                      setPinError(false);
                    }}
                    onKeyDown={handlePinKeyDown}
                    className={cn(
                      "slotkit-input slotkit-pin-field",
                      pinError && "slotkit-pin-error",
                    )}
                    placeholder="****"
                    autoFocus
                    aria-label="PIN"
                  />
                  <button
                    type="button"
                    className="slotkit-button-primary"
                    onClick={handleUnlock}
                  >
                    Unlock
                  </button>
                </div>
                {pinError && (
                  <p className="slotkit-error">Incorrect PIN</p>
                )}
              </>
            ) : (
              <button
                type="button"
                className="slotkit-button-primary slotkit-button-large"
                onClick={() => {
                  setIsLocked(false);
                  resetIdleTimer();
                }}
              >
                Tap to Unlock
              </button>
            )}
          </div>
        </div>
      )}

      {/* Kiosk Toolbar */}
      <div className="slotkit-kiosk-shell-toolbar">
        <button
          type="button"
          className="slotkit-button-secondary slotkit-button-small"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen (F11)"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? "\u2715 Exit" : "\u26F6 Fullscreen"}
        </button>
        {autoLockMinutes > 0 && (
          <button
            type="button"
            className="slotkit-button-secondary slotkit-button-small"
            onClick={() => setIsLocked(true)}
            title="Lock kiosk"
            aria-label="Lock kiosk"
          >
            &#128274; Lock
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="slotkit-kiosk-shell-content">{children}</div>
    </div>
  );
}
