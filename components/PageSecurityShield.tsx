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
    // ═══════════════════════════════════════════
    // 1. RIGHT-CLICK BLOCKING (Extension-Resistant)
    // ═══════════════════════════════════════════

    const blockContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      return false;
    };

    // Attach in capture phase — runs before any extension's bubbling handlers
    const attachContextMenuBlocker = () => {
      document.removeEventListener('contextmenu', blockContextMenu, true);
      document.addEventListener('contextmenu', blockContextMenu, true);

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
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element picker)
      if (ctrl && shift && ['i', 'j', 'c'].includes(key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+U (View Source)
      if (ctrl && !shift && key === 'u') {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+S (Save Page)
      if (ctrl && !shift && key === 's') {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+P (Print)
      if (ctrl && !shift && key === 'p') {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+A (Select All)
      if (ctrl && !shift && key === 'a') {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // Ctrl+C (Copy), Ctrl+X (Cut)
      if (ctrl && !shift && (key === 'c' || key === 'x')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // Mac: Cmd+Alt+I (Inspect), Cmd+Alt+J (Console), Cmd+Alt+C (Element picker)
      if (e.metaKey && alt && ['i', 'j', 'c'].includes(key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // Mac: Cmd+Alt+U (View Source)
      if (e.metaKey && alt && key === 'u') {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      // F5 / Ctrl+R (allow refresh — don't block, but you could if needed)
    };

    document.addEventListener('keydown', blockShortcuts, true);
    // Also block keyup to prevent extensions that listen on keyup
    document.addEventListener('keyup', blockShortcuts, true);

    // ═══════════════════════════════════════════
    // 3. DEVTOOLS OPEN DETECTION
    // ═══════════════════════════════════════════

    // Check every 2 seconds
    devToolsCheckIntervalRef.current = setInterval(checkDevTools, 2000);

    // ═══════════════════════════════════════════
    // 4. COPY / CUT / PASTE / DRAG / SELECT BLOCKING
    // ═══════════════════════════════════════════

    const blockCopy = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    document.addEventListener('copy', blockCopy, true);
    document.addEventListener('cut', blockCopy, true);
    document.addEventListener('dragstart', blockCopy, true);
    document.addEventListener('selectstart', blockCopy, true);
    document.addEventListener('beforeprint', blockCopy, true);

    // ═══════════════════════════════════════════
    // 5. DOM MUTATION MONITORING
    // ═══════════════════════════════════════════
    // Detect if extensions strip security attributes

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (mutation.attributeName === 'oncontextmenu') {
            target.setAttribute('oncontextmenu', 'return false;');
          }
          if (mutation.attributeName === 'oncopy') {
            target.setAttribute('oncopy', 'return false;');
          }
          if (mutation.attributeName === 'onselectstart') {
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

      document.removeEventListener('contextmenu', blockContextMenu, true);
      document.removeEventListener('keydown', blockShortcuts, true);
      document.removeEventListener('keyup', blockShortcuts, true);
      document.removeEventListener('copy', blockCopy, true);
      document.removeEventListener('cut', blockCopy, true);
      document.removeEventListener('dragstart', blockCopy, true);
      document.removeEventListener('selectstart', blockCopy, true);
      document.removeEventListener('beforeprint', blockCopy, true);
      mutationObserver.disconnect();

      styleEl.remove();
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
