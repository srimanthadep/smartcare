import { useState, useEffect } from 'react';

/**
 * Type definition for browser's install prompt event
 */
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

// ─── Module-Level Storage ───────────────────────────────────────────────────
// Capture the beforeinstallprompt event at module level so it's never missed
// even if React components mount/unmount before the event fires
let _deferredPrompt: BeforeInstallPromptEvent | null = null;
const _subscribers = new Set<() => void>();

// ─── Capture Browser Install Prompt ─────────────────────────────────────────
window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent default browser UI
    e.preventDefault();
    
    // Store the event for later use
    _deferredPrompt = e as BeforeInstallPromptEvent;
    
    // Notify all subscribers (React components) that prompt is ready
    _subscribers.forEach(fn => fn());
});

// ─── App Installed ──────────────────────────────────────────────────────────
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed to home screen');
    _deferredPrompt = null;
    _subscribers.forEach(fn => fn());
});

/**
 * React Hook: Manage PWA installation
 * 
 * Returns:
 * - isInstallable: boolean - true if browser supports PWA install
 * - installApp: () => Promise<void> - trigger install dialog
 */
export function usePWA() {
    // Initialize with stored prompt
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(_deferredPrompt);
    
    // Can only install if we have the prompt event
    const isInstallable = !!installPrompt;

    useEffect(() => {
        // Sync function: updates state when prompt event fires
        const sync = () => setInstallPrompt(_deferredPrompt);
        
        // Register this component as a subscriber
        _subscribers.add(sync);
        
        // Sync in case event already fired before component mounted
        sync();
        
        // Cleanup
        return () => { 
            _subscribers.delete(sync); 
        };
    }, []);

    /**
     * Trigger the OS install dialog
     * 
     * Flow:
     * 1. Call prompt() to show OS install UI
     * 2. Wait for user choice (accept or dismiss)
     * 3. Clear prompt if accepted (can't be used again)
     */
    const installApp = async () => {
        if (!installPrompt) return;

        // Show the OS install prompt
        await installPrompt.prompt();
        
        // Wait for user choice
        const { outcome } = await installPrompt.userChoice;

        // If accepted, clear the prompt (can only be used once)
        if (outcome === 'accepted') {
            _deferredPrompt = null;
            setInstallPrompt(null);
        }
    };

    return { isInstallable, installApp };
}
