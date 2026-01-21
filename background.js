// Background Service Worker
import { CookieManager } from './extension/lib/cookie_manager.js';
import { StorageManager } from './extension/lib/storage.js';
import { HealthManager } from './extension/lib/health_manager.js';
import { TermsManager } from './extension/lib/terms_manager.js';

// Initialize services
const storage = new StorageManager();
const cookieManager = new CookieManager(storage);
const healthManager = new HealthManager();
const termsManager = new TermsManager(storage);

// Start Health Monitoring
healthManager.start((status, data) => {
    // Broadcast health update
    try {
        const payload = {
            status: status, // 'online', 'offline', 'unstable', 'starting'
            details: data   // { status: 'ready', uptime_sec... }
        };
        chrome.runtime.sendMessage({ action: 'health_update', payload: payload }).catch(() => { });
    } catch (e) {
        // Popup likely closed
    }
});

// Listen for cookie changes
chrome.cookies.onChanged.addListener((changeInfo) => {
    console.log('Cookie changed:', changeInfo);
    cookieManager.handleCookieChange(changeInfo);
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCookies') {
        // Return cached analyses or fetch fresh
        storage.getAllCookies()
            .then(cookies => {
                if (request.url) {
                    // Simple domain check
                    try {
                        const urlObj = new URL(request.url);
                        const hostname = urlObj.hostname;
                        const filtered = cookies.filter(c => {
                            if (!c.raw || !c.raw.domain) return false;
                            const cDomain = c.raw.domain.startsWith('.') ? c.raw.domain.slice(1) : c.raw.domain;
                            // match: hostname ends with cookie domain (e.g. mail.google.com ends with google.com)
                            return hostname.endsWith(cDomain) || cDomain.endsWith(hostname);
                        });
                        return filtered;
                    } catch (e) {
                        return cookies;
                    }
                }
                return cookies;
            })
            .then(sendResponse);
        return true; // async response
    }

    if (request.action === 'updateCookieStatus') {
        cookieManager.updateCookieStatus(request.cookieId, request.status)
            .then(() => sendResponse({ success: true }));
        return true;
    }

    if (request.action === 'analyze_domain') {
        cookieManager.analyzeDomain(request.domain, (current, total) => {
            // Progress update
            chrome.runtime.sendMessage({
                action: 'analysis_progress',
                current,
                total
            }).catch(() => { });
        })
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ error: err.message }));
        return true;
    }

    // Direct health query (for popup initial load)
    if (request.action === 'getHealth') {
        sendResponse({
            status: healthManager.status,
            details: healthManager.history.length > 0 && healthManager.history[healthManager.history.length - 1].success
                ? healthManager.history[healthManager.history.length - 1].data
                : null
        });
        return true;
    }

    // Terms & Conditions Logic
    if (request.action === 'scan_terms') {
        // Must have active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                termsManager.scanForLinks(tabs[0].id)
                    .then(links => sendResponse({ links }))
                    .catch(err => sendResponse({ error: err.message }));
            } else {
                sendResponse({ error: "No active tab" });
            }
        });
        return true;
    }

    if (request.action === 'analyze_terms') {
        termsManager.analyze(request.url, request.type, (current, total) => {
            // Progress update
            try {
                chrome.runtime.sendMessage({
                    action: 'terms_progress',
                    current,
                    total
                });
            } catch (e) { }
        })
            .then(result => sendResponse({ result }))
            .catch(err => sendResponse({ error: err.message }));
        return true;
    }

    // Global Trust Score: Fetch cached T&C risk
    if (request.action === 'get_terms_risk') {
        // user might have analyzed terms OR privacy. Return max risk found.
        Promise.all([
            storage.getTermsAnalysis(request.domain, 'terms'),
            storage.getTermsAnalysis(request.domain, 'privacy')
        ]).then(([t, p]) => {
            let score = undefined;
            if (t) score = t.risk_score;
            if (p) score = Math.max(score || 0, p.risk_score);
            sendResponse({ risk_score: score });
        });
        return true;
    }
    if (request.action === 'analyze_current_page') {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (!tabs[0]) {
                sendResponse({ error: "No active tab" });
                return;
            }

            // 1. Extract Text
            const text = await termsManager.getTextFromTab(tabs[0].id);
            if (!text || text.length < 500) {
                sendResponse({ error: "Text too short or not found." });
                return;
            }

            // 2. Validate keywords (simple check)
            const lower = text.toLowerCase().slice(0, 5000); // Check first 5k char
            const keywords = ['privacy', 'terms', 'agreement', 'policy', 'data'];
            const hasKeywords = keywords.some(k => lower.includes(k));
            if (!hasKeywords) {
                // Warning but proceed? Maybe strict.
                // sendResponse({ error: "Doesn't look like a legal document." });
                // return;
            }

            // 3. Start Analysis
            // We reuse 'analyze' but need to bypass fetch.
            // Let's create 'analyzeText' or just adapt 'analyze' to take text optionally.
            // For now, let's create a temporary adapter in TermsManager or just call a new method.
            // Better: update TermsManager to support analyzing raw text.
            termsManager.analyzeText(text, request.domain, request.type || 'terms', (current, total) => {
                try {
                    chrome.runtime.sendMessage({
                        action: 'terms_progress',
                        current,
                        total
                    });
                } catch (e) { }
            })
                .then(result => sendResponse({ result }))
                .catch(err => sendResponse({ error: err.message }));
        });
        return true;
    }
});

