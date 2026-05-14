import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWA } from '../hooks/usePWA';

/**
 * Floating install banner shown at the bottom of every page (including login)
 * when the browser fires `beforeinstallprompt`.
 * 
 * This makes the "Add to Home Screen" action discoverable without requiring
 * the user to look in the browser's menu.
 */
export default function InstallPromptBanner() {
    const { isInstallable, installApp } = usePWA();
    const [dismissed, setDismissed] = useState(() => {
        return localStorage.getItem("pwa-prompt-dismissed") === "true";
    });
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Hide banner when already running as an installed PWA
        // (display-mode: standalone) means app is installed and running full-screen
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsStandalone(true);
        }
    }, []);

    const handleInstall = async () => {
        await installApp();
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem("pwa-prompt-dismissed", "true");
    };

    // Don't show if: already standalone, dismissed, or not installable
    if (isStandalone || dismissed || !isInstallable) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    color: 'white',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    zIndex: 10000,
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
                }}
                role="banner"
                aria-label="Install app banner"
            >
                {/* App Logo */}
                <img
                    src="/icons/icon-192.png"
                    alt="Siara Dental App Logo"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0
                    }}
                />

                {/* Text Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
                        Install Siara Dental App
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                        Add to home screen for quick access
                    </div>
                </div>

                {/* Install Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleInstall}
                    style={{
                        background: 'white',
                        color: '#0f172a',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 14px',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    ⬇️ Install
                </motion.button>

                {/* Dismiss Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDismiss}
                    aria-label="Dismiss install banner"
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 8,
                        color: 'white',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 500,
                        flexShrink: 0,
                    }}
                >
                    Remind me later
                </motion.button>
            </motion.div>
        </AnimatePresence>
    );
}
