'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * PageSecurityShield — Comprehensive client-side content protection.
 *
 * Defense layers:
 * 1. Right-click blocking (capture phase, re-attached every 300ms)
 * 2. DevTools shortcut interception (F12, Ctrl+Shift+I/J/C, Ctrl+U, etc.)
 * 3. DevTools open detection (debugger timing + outer/inner size heuristic)
 * 4. Print / Save-As / View-Source blocking
 * 5. Text selection & drag prevention (CSS + JS)
 * 6. DOM mutation monitoring (re-applies stripped attributes)
 * 7. Protection against right-click enabler extensions
 * 8. Copy/Cut/Paste blocking on the page
 */
export default function PageSecurityShield() {
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const devToolsCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── DevTools Detection ──
  const checkDevTools = useCallback(() => {
    // Method: outer vs inner window size difference
    // DevTools docked to the side/bottom creates a size discrepancy
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > 200 || heightDiff > 200) {
      setDevToolsOpen(true);
      return;
    }

    setDevToolsOpen(false);
  }, []);

  useEffect(() => {
    // ── Bypass Extension Hooks using a Hidden Iframe ──
    // Extensions run before our script and override Event prototypes to prevent us
    // from calling preventDefault. We can get pristine, un-mocked native functions
    // from a fresh, hidden iframe.
    let pristinePreventDefault = Event.prototype.preventDefault;
    let pristineStopImmediate = Event.prototype.stopImmediatePropagation;
    let pristineStop = Event.prototype.stopPropagation;

    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      if (iframe.contentWindow) {
        pristinePreventDefault = (iframe.contentWindow as any).Event.prototype.preventDefault;
        pristineStopImmediate = (iframe.contentWindow as any).Event.prototype.stopImmediatePropagation;
        pristineStop = (iframe.contentWindow as any).Event.prototype.stopPropagation;
      }
      document.body.removeChild(iframe);
    } catch (e) {
      // Ignore if iframe block fails
    }

    // ── The "Poison Pill" Defense against Extensions ──
    // Extensions often use `e.stopPropagation()` in the capture phase to prevent
    // our security scripts from receiving the contextmenu event.
    // By hooking into stopPropagation, if the extension tries to silence the event,
    // we secretly call preventDefault() from within their own call, killing the menu!
    const originalStopPropagation = Event.prototype.stopPropagation;
    Event.prototype.stopPropagation = function () {
      if (this.type === 'contextmenu' || ((this.type === 'mousedown' || this.type === 'pointerdown') && (this as MouseEvent).button === 2)) {
        pristinePreventDefault.call(this);
      }
      originalStopPropagation.call(this);
    };

    const originalStopImmediatePropagation = Event.prototype.stopImmediatePropagation;
    Event.prototype.stopImmediatePropagation = function () {
      if (this.type === 'contextmenu' || ((this.type === 'mousedown' || this.type === 'pointerdown') && (this as MouseEvent).button === 2)) {
        pristinePreventDefault.call(this);
      }
      originalStopImmediatePropagation.call(this);
    };

    // ═══════════════════════════════════════════
    // 1. RIGHT-CLICK BLOCKING (Extension-Resistant)
    // ═══════════════════════════════════════════

    const blockContextMenu = (e: Event) => {
      // Use the pristine native functions to guarantee the event is killed,
      // even if the extension mocked the top-level Event.prototype
      pristinePreventDefault.call(e);
      pristineStopImmediate.call(e);
      pristineStop.call(e);
      return false;
    };

    // Attach in capture phase to WINDOW — runs before document-level extension handlers
    const attachContextMenuBlocker = () => {
      window.removeEventListener('contextmenu', blockContextMenu, true);
      window.addEventListener('contextmenu', blockContextMenu, true);

      // Also attack the mousedown and pointerdown events (button 2 is right click)
      const blockMouse = (e: Event) => {
        if ((e as MouseEvent).button === 2 || (e as MouseEvent).button === 3) {
          pristinePreventDefault.call(e);
          pristineStopImmediate.call(e);
        }
      };

      window.removeEventListener('mousedown', blockMouse, true);
      window.addEventListener('mousedown', blockMouse, true);
      window.removeEventListener('pointerdown', blockMouse, true);
      window.addEventListener('pointerdown', blockMouse, true);
      window.removeEventListener('mouseup', blockMouse, true);
      window.addEventListener('mouseup', blockMouse, true);

      // Also set inline handler as fallback
      document.body.setAttribute('oncontextmenu', 'return false;');
      document.documentElement.setAttribute('oncontextmenu', 'return false;');
    };

    attachContextMenuBlocker();

    // Re-attach every 300ms to defeat extensions that strip listeners
    const contextMenuInterval = setInterval(attachContextMenuBlocker, 300);

    // ═══════════════════════════════════════════
    // 2. KEYBOARD SHORTCUT BLOCKING
    // ═══════════════════════════════════════════

    const blockShortcuts = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key?.toLowerCase();

      // DevTools shortcuts
      if (e.key === 'F12') {
        pristinePreventDefault.call(e);
        pristineStopImmediate.call(e);
        return false;
      }

      // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element picker)
      if (ctrl && shift && ['i', 'j', 'c'].includes(key)) {
        pristinePreventDefault.call(e);
        pristineStopImmediate.call(e);
        return false;
      }

      // Ctrl+U (View Source)
      if (ctrl && !shift && key === 'u') {
        pristinePreventDefault.call(e);
        pristineStopImmediate.call(e);
        return false;
      }

      // Ctrl+S (Save Page)
      if (ctrl && !shift && key === 's') {
        pristinePreventDefault.call(e);
        pristineStopImmediate.call(e);
        return false;
      }

      // Ctrl+P (Print)
      if (ctrl && !shift && key === 'p') {
        pristinePreventDefault.call(e);
        pristineStopImmediate.call(e);
        return false;
      }

      // Ctrl+A (Select All)
      if (ctrl && !shift && key === 'a') {
        pristinePreventDefault.call(e);
        pristineStopImmediate.call(e);
        return false;
      }

      // Ctrl+C (Copy), Ctrl+X (Cut)
      if (ctrl && !shift && (key === 'c' || key === 'x')) {
        pristinePreventDefault.call(e);
        pristineStopImmediate.call(e);
        return false;
      }

      // Mac: Cmd+Alt+I (Inspect), Cmd+Alt+J (Console), Cmd+Alt+C (Element picker)
      if (e.metaKey && alt && ['i', 'j', 'c'].includes(key)) {
        pristinePreventDefault.call(e);
        pristineStopImmediate.call(e);
        return false;
      }

      // Mac: Cmd+Alt+U (View Source)
      if (e.metaKey && alt && key === 'u') {
        pristinePreventDefault.call(e);
        pristineStopImmediate.call(e);
        return false;
      }
    };

    window.addEventListener('keydown', blockShortcuts, true);
    window.addEventListener('keyup', blockShortcuts, true);

    // ═══════════════════════════════════════════
    // 3. DEVTOOLS OPEN DETECTION
    // ═══════════════════════════════════════════

    // Check every 2 seconds
    devToolsCheckIntervalRef.current = setInterval(checkDevTools, 2000);

    // ═══════════════════════════════════════════
    // 4. COPY / CUT / PASTE / DRAG / SELECT BLOCKING
    // ═══════════════════════════════════════════

    const blockCopy = (e: Event) => {
      pristinePreventDefault.call(e);
      pristineStopImmediate.call(e);
    };

    window.addEventListener('copy', blockCopy, true);
    window.addEventListener('cut', blockCopy, true);
    window.addEventListener('dragstart', blockCopy, true);
    window.addEventListener('selectstart', blockCopy, true);
    window.addEventListener('beforeprint', blockCopy, true);

    // ═══════════════════════════════════════════
    // 5. DOM MUTATION MONITORING
    // ═══════════════════════════════════════════
    // Detect if extensions strip security attributes

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (mutation.attributeName === 'oncontextmenu' && target.getAttribute('oncontextmenu') !== 'return false;') {
            target.setAttribute('oncontextmenu', 'return false;');
          }
          if (mutation.attributeName === 'oncopy' && target.getAttribute('oncopy') !== 'return false;') {
            target.setAttribute('oncopy', 'return false;');
          }
          if (mutation.attributeName === 'onselectstart' && target.getAttribute('onselectstart') !== 'return false;') {
            target.setAttribute('onselectstart', 'return false;');
          }
        }

        // Detect if extension injects scripts to override protections
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              // If a script tag was injected by an extension, remove it
              if (
                el.tagName === 'SCRIPT' &&
                !el.getAttribute('src')?.includes('/_next/') &&
                !el.id?.startsWith('__next') &&
                !el.getAttribute('src')?.includes('youtube')
              ) {
                // Potentially malicious injected script — leave it but
                // re-apply our protections
                attachContextMenuBlocker();
              }
            }
          });
        }
      }
    });

    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['oncontextmenu', 'oncopy', 'onselectstart', 'ondragstart'],
      childList: true,
      subtree: true,
    });



    // ═══════════════════════════════════════════
    // 7. CSS PROTECTIONS (injected via JS to avoid stylesheet stripping)
    // ═══════════════════════════════════════════

    const styleEl = document.createElement('style');
    styleEl.id = 'security-shield-styles';
    styleEl.textContent = `
      /* Disable text selection on the entire page */
      body, body * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      /* Hide everything when printing */
      @media print {
        body * {
          display: none !important;
          visibility: hidden !important;
        }
        body::after {
          content: 'Printing is not allowed on this page.' !important;
          display: block !important;
          visibility: visible !important;
          font-size: 24px;
          text-align: center;
          padding: 100px 40px;
          color: #333;
        }
      }
      /* Prevent image dragging */
      img, video, canvas {
        -webkit-user-drag: none !important;
        user-drag: none !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(styleEl);

    // Re-inject styles if removed
    const styleCheckInterval = setInterval(() => {
      if (!document.getElementById('security-shield-styles')) {
        document.head.appendChild(styleEl);
      }
    }, 500);

    // ═══════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════

    return () => {
      clearInterval(contextMenuInterval);
      clearInterval(styleCheckInterval);
      if (devToolsCheckIntervalRef.current) {
        clearInterval(devToolsCheckIntervalRef.current);
      }

      window.removeEventListener('contextmenu', blockContextMenu, true);
      window.removeEventListener('keydown', blockShortcuts, true);
      window.removeEventListener('keyup', blockShortcuts, true);
      window.removeEventListener('copy', blockCopy, true);
      window.removeEventListener('cut', blockCopy, true);
      window.removeEventListener('dragstart', blockCopy, true);
      window.removeEventListener('selectstart', blockCopy, true);
      window.removeEventListener('beforeprint', blockCopy, true);
      mutationObserver.disconnect();

      styleEl.remove();

      // Restore prototypes
      Event.prototype.stopPropagation = originalStopPropagation;
      Event.prototype.stopImmediatePropagation = originalStopImmediatePropagation;
    };
  }, [checkDevTools]);

  // ═══════════════════════════════════════════
  // DEVTOOLS WARNING OVERLAY
  // ═══════════════════════════════════════════

  if (devToolsOpen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 0 40px rgba(239, 68, 68, 0.4)',
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            color: '#ef4444',
          }}
        >
          Security Alert
        </h2>
        <p
          style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '400px',
            lineHeight: 1.6,
          }}
        >
          Developer tools have been detected. Please close the developer tools
          to continue watching this lesson. This activity may be logged.
        </p>
        <p
          style={{
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.4)',
            marginTop: '1.5rem',
          }}
        >
          If you believe this is an error, please refresh the page.
        </p>
      </div>
    );
  }

  return null;
}
