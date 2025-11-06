// ==UserScript==
// @name         Highlight Scaled Images
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  A useful tool for frontend developers to detect bad image quality issues on HTML pages. The script scans all images and highlights problematic images: adds a tint and overlay text to images scaled by the browser (upscaled, downscaled).
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    // Default settings
    const DEFAULTS = {
        showDownscale: true,
        showProportional: true,
        // enabledDomains holds an array of hostnames where the script is active.
        // Empty array = disabled everywhere by default.
        enabledDomains: []
    };

    // Utility to get and set settings
    function getSetting(key) {
        const val = GM_getValue(key);
        if (typeof val === 'undefined') return DEFAULTS[key];
        return val;
    }
    function setSetting(key, value) {
        GM_setValue(key, value);
    }

    // Domain helpers
    function getHost() {
        try { return location.hostname; } catch (e) { return ''; }
    }
    function isEnabledForCurrentDomain() {
        const enabled = getSetting('enabledDomains') || [];
        const host = getHost();
        return enabled.indexOf(host) !== -1;
    }
    function enableForCurrentDomain() {
        const host = getHost();
        if (!host) return;
        const enabled = Array.isArray(getSetting('enabledDomains')) ? getSetting('enabledDomains') : [];
        if (enabled.indexOf(host) === -1) {
            enabled.push(host);
            setSetting('enabledDomains', enabled);
        }
    }
    function disableForCurrentDomain() {
        const host = getHost();
        if (!host) return;
        const enabled = Array.isArray(getSetting('enabledDomains')) ? getSetting('enabledDomains') : [];
        const idx = enabled.indexOf(host);
        if (idx !== -1) {
            enabled.splice(idx, 1);
            setSetting('enabledDomains', enabled);
        }
    }
    function listEnabledDomains() {
        return Array.isArray(getSetting('enabledDomains')) ? getSetting('enabledDomains') : [];
    }
    function clearEnabledDomains() {
        setSetting('enabledDomains', []);
    }

    // Overlay logic
    let __overlayIdCounter = 1;
    function createOverlay(text, color, img) {
        const overlay = document.createElement('div');
        overlay.textContent = text;
        overlay.style.position = 'absolute';
        overlay.style.left = '50%';
        overlay.style.top = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.color = '#fff';
        overlay.style.background = color;
        overlay.style.padding = '2px 6px';
        overlay.style.borderRadius = '6px';
        overlay.style.fontSize = '0.8em';
        overlay.style.fontWeight = 'bold';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '10';
        overlay.className = 'img-scale-overlay';
        // link overlay to image via dataset for reliable removal
        if (!img.dataset.scaleOverlayId) img.dataset.scaleOverlayId = String(__overlayIdCounter++);
        overlay.dataset.forImgId = img.dataset.scaleOverlayId;
        overlay.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
        overlay.style.opacity = '0.85';
        overlay.style.border = '1px solid #fff';
        overlay.style.whiteSpace = 'nowrap';
        overlay.style.minWidth = img.offsetWidth + 'px';
        return overlay;
    }

    function removeOverlays(img) {
        if (!img.parentElement) return;
        const id = img.dataset.scaleOverlayId;
        Array.from(img.parentElement.querySelectorAll('.img-scale-overlay')).forEach(function (overlay) {
            // remove overlays that belong to this image (by dataset) or that are directly adjacent
            if ((id && overlay.dataset.forImgId === id) || overlay.previousSibling === img || overlay.nextSibling === img) {
                overlay.remove();
            }
        });
    }

    function getScalePercent(img) {
        const widthScale = img.offsetWidth / img.naturalWidth;
        const heightScale = img.offsetHeight / img.naturalHeight;
        const scale = Math.max(widthScale, heightScale);
        const percent = scale * 100;
        if (Math.abs(percent - Math.round(percent)) > 0.01) {
            return percent.toFixed(2);
        } else {
            return Math.round(percent).toString();
        }
    }

    function getDownsizeLabelAndTint(img, scalePercent) {
        const percentNum = parseFloat(scalePercent);
        const origSize = `${img.naturalWidth}x${img.naturalHeight}`;
        const realSize = `${img.offsetWidth}x${img.offsetHeight}`;
        let sizeText = `[${origSize} → ${realSize}]`;
        if (Math.abs(percentNum - 50) < 0.01) {
            return {
                text: `Downsized 2x (${scalePercent}%) ${sizeText}`,
                color: 'rgba(0,180,60,0.7)',
                tint: 'brightness(0.7) sepia(1) hue-rotate(90deg) saturate(5)',
                isProportional: true
            };
        } else if (Math.abs(percentNum - 25) < 0.01) {
            return {
                text: `Downsized 4x (${scalePercent}%) ${sizeText}`,
                color: 'rgba(0,180,60,0.7)',
                tint: 'brightness(0.7) sepia(1) hue-rotate(90deg) saturate(5)',
                isProportional: true
            };
        } else {
            return {
                text: `Downsized ${scalePercent}% ${sizeText}`,
                color: 'rgba(0, 80, 255, 0.7)',
                tint: 'brightness(0.7) sepia(1) hue-rotate(180deg) saturate(5)',
                isProportional: false
            };
        }
    }

    function getUpsizeLabel(img, scalePercent) {
        const origSize = `${img.naturalWidth}x${img.naturalHeight}`;
        const realSize = `${img.offsetWidth}x${img.offsetHeight}`;
        let sizeText = `[${origSize} → ${realSize}]`;
        return {
            text: `Upsized ${scalePercent}% ${sizeText}`,
            color: 'rgba(255, 40, 40, 0.7)',
            tint: 'brightness(0.7) sepia(1) hue-rotate(-50deg) saturate(5)'
        };
    }

    function applyTintToImages() {
        const showDownscale = getSetting('showDownscale');
        const showProportional = getSetting('showProportional');

        document.querySelectorAll('img').forEach(function (img) {
            // always clear previous overlays for this image to avoid duplicates
            removeOverlays(img);
            // keep a small transition for filter changes
            img.style.transition = 'filter 0.3s';

            if (img.naturalWidth > 0 && img.naturalHeight > 0 && img.offsetWidth > 0 && img.offsetHeight > 0) {
                const isDownsized = img.offsetWidth < img.naturalWidth || img.offsetHeight < img.naturalHeight;
                const isUpsized = img.offsetWidth > img.naturalWidth || img.offsetHeight > img.naturalHeight;
                if (isDownsized || isUpsized) {
                    const parent = img.parentElement;
                    if (parent) {
                        // only set position if computed style is static and remember original value
                        const parentStyle = window.getComputedStyle(parent);
                        if (parentStyle.position === 'static') {
                            if (typeof parent.dataset.originalPosition === 'undefined') {
                                parent.dataset.originalPosition = parent.style.position || '';
                            }
                            parent.style.position = 'relative';
                        }
                    }
                    let overlay, scalePercent, label;
                    scalePercent = getScalePercent(img);
                    if (isDownsized) {
                        label = getDownsizeLabelAndTint(img, scalePercent);
                        // Only show if allowed by settings
                        if ((label.isProportional && showProportional) || (!label.isProportional && showDownscale)) {
                            img.style.filter = label.tint;
                            overlay = createOverlay(label.text, label.color, img);
                            const parent = img.parentElement;
                            if (parent) {
                                if (img.nextSibling) {
                                    parent.insertBefore(overlay, img.nextSibling);
                                } else {
                                    parent.appendChild(overlay);
                                }
                            }
                        }
                    } else if (isUpsized) {
                        label = getUpsizeLabel(img, scalePercent);
                        img.style.filter = label.tint;
                        overlay = createOverlay(label.text, label.color, img);
                        const parent = img.parentElement;
                        if (parent) {
                            if (img.nextSibling) {
                                parent.insertBefore(overlay, img.nextSibling);
                            } else {
                                parent.appendChild(overlay);
                            }
                        }
                    }
                } else {
                    // image at 100% - remove any filter and restore parent position if we changed it
                    img.style.filter = '';
                    const parent = img.parentElement;
                    if (parent && typeof parent.dataset.originalPosition !== 'undefined') {
                        parent.style.position = parent.dataset.originalPosition || '';
                        delete parent.dataset.originalPosition;
                    }
                }
            }
        });
    }

    // Menu registration (only once, no duplicates)
    GM_registerMenuCommand('Toggle Downscale (blue) highlight', function () {
        const current = getSetting('showDownscale');
        setSetting('showDownscale', !current);
        console.log('Downscale highlight:', !current ? 'ON' : 'OFF');
        applyTintToImages();
    });

    GM_registerMenuCommand('Toggle Proportional (green) highlight', function () {
        const current = getSetting('showProportional');
        setSetting('showProportional', !current);
        console.log('Proportional highlight:', !current ? 'ON' : 'OFF');
        applyTintToImages();
    });

    // Domain enable/disable controls
    GM_registerMenuCommand('Enable for this domain', function () {
        enableForCurrentDomain();
        console.log('Highlight Scaled Images: ENABLED for', getHost());
        // apply immediately if on this host
        if (isEnabledForCurrentDomain()) applyTintToImages();
    });

    GM_registerMenuCommand('Disable for this domain', function () {
        disableForCurrentDomain();
        console.log('Highlight Scaled Images: DISABLED for', getHost());
        // remove overlays and filters immediately
        applyTintToImages();
    });

    GM_registerMenuCommand('List enabled domains', function () {
        const list = listEnabledDomains();
        alert('Enabled domains:\n' + (list.length ? list.join('\n') : '(none)'));
    });

    GM_registerMenuCommand('Clear enabled domains', function () {
        if (confirm('Clear all enabled domains?')) {
            clearEnabledDomains();
            applyTintToImages();
        }
    });

    // Only run the active parts of the script when the current domain is enabled.
    // Menu commands above remain available regardless.
    let observer = null;
    let debouncedApply = null;
    function attachRuntime() {
        // Initial scan
        applyTintToImages();

        // Reapply on window resize
        window.addEventListener('resize', applyTintToImages);

        // Debounced runner to avoid rapid repeat work and avoid reacting to our own changes
        function debounce(fn, wait) {
            let t = null;
            return function () {
                const args = arguments;
                clearTimeout(t);
                t = setTimeout(function () { fn.apply(null, args); }, wait);
            };
        }

        debouncedApply = debounce(applyTintToImages, 120);

        // Reapply on DOM changes (lazy load, AJAX, etc.)
        observer = new MutationObserver(function (mutations) {
            // ignore mutations that are only our overlays being added/removed
            for (const m of mutations) {
                if (m.type === 'childList') {
                    // if any added/removed node is our overlay, skip scheduling
                    const nodes = [...m.addedNodes, ...m.removedNodes];
                    let skip = false;
                    for (const n of nodes) {
                        if (n.nodeType === 1 && n.classList && n.classList.contains('img-scale-overlay')) {
                            skip = true;
                            break;
                        }
                    }
                    if (skip) continue;
                }
                // schedule debounced apply for other mutations
                debouncedApply();
                return;
            }
        });
        // avoid observing style/class changes we make; only observe src/srcset and structural changes
        try {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src', 'srcset']
            });
        } catch (e) {
            // ignore if document.body isn't available yet
        }

        // Cleanup on page unload/navigation to avoid keeping observer references
        window.addEventListener('beforeunload', cleanup, { passive: true });
        window.addEventListener('pagehide', cleanup, { passive: true });

        // Also reapply when images finish loading (for lazy-loaded images)
        document.body.addEventListener('load', function (e) {
            if (e.target.tagName === 'IMG') {
                applyTintToImages();
            }
        }, true);
    }

    function detachRuntime() {
        try { if (observer) observer.disconnect(); } catch (e) { /* ignore */ }
        observer = null;
        debouncedApply = null;
        // remove any overlays we added and clear filters
        document.querySelectorAll('.img-scale-overlay').forEach(function (o) { o.remove(); });
        document.querySelectorAll('img').forEach(function (img) { img.style.filter = ''; });
        // try to restore parent positions we modified
        document.querySelectorAll('[data-original-position]').forEach(function (el) {
            try { el.style.position = el.dataset.originalPosition || ''; delete el.dataset.originalPosition; } catch (e) { }
        });
    }

    // Ensure runtime is attached only when enabled
    if (isEnabledForCurrentDomain()) {
        attachRuntime();
    }
})();
