export const ZOOM_STORAGE_KEY = 'zoomEnabled';

export function getZoomEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(ZOOM_STORAGE_KEY);
    return stored !== 'false';
}

export function applyZoom(enabled: boolean, save: boolean = true): void {
    if (typeof window === 'undefined') return;
    
    if (save) {
        localStorage.setItem(ZOOM_STORAGE_KEY, String(enabled));
    }
    
    // In a real app, this might update a meta viewport tag to enable/disable user-scalable
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        if (enabled) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
        } else {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
    }
}
