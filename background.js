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
console.log("[TrustLayer] Starting Health Manager...");
healthManager.start((status, data) => {
    // Broadcast health update
    console.log("[TrustLayer] Health Status Changed:", status);
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
        console.log("[TrustLayer] getCookies request received for:", request.url);
        if (request.url) {
            // 1. Sync with browser cookies for this URL
            try {
                chrome.cookies.getAll({ url: request.url }, async (browserCookies) => {
                    try {
                        if (browserCookies) {
                            await cookieManager.syncCookies(browserCookies);
                        }
                    } catch (err) {
                        console.error("Cookie Sync Error:", err);
                    }

                    // 2. Return cached analyses
                    storage.getAllCookies()
                        .then(cookies => {
                            // Simple domain check filter
                            try {
                                const urlObj = new URL(request.url);
                                const hostname = urlObj.hostname;
                                const filtered = cookies.filter(c => {
                                    if (!c.raw || !c.raw.domain) return false;
                                    const cDomain = c.raw.domain.startsWith('.') ? c.raw.domain.slice(1) : c.raw.domain;
                                    return hostname.endsWith(cDomain) || cDomain.endsWith(hostname);
                                });
                                sendResponse(filtered);
                            } catch (e) {
                                sendResponse(cookies);
                            }
                        })
                        .catch(err => {
                            console.error("Storage Error:", err);
                            sendResponse([]);
                        });
                });
            } catch (e) {
                console.error("Cookie Fetch Error:", e);
                storage.getAllCookies().then(sendResponse);
            }
            return true; // async response
        }

        // Fallback for no URL (all cookies)
        storage.getAllCookies().then(sendResponse);
        return true;
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
        console.log("[TrustLayer] getHealth request. Current status:", healthManager.status);
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
            .catch(err => {
                console.error("Terms Analysis Error:", err);
                sendResponse({ error: err.message });
            });
        return true;
    }

    // Global Trust Score: Fetch cached T&C risk
    if (request.action === 'get_terms_risk') {
        // user might have analyzed terms OR privacy OR manual. Return max risk found.
        Promise.all([
            storage.getTermsAnalysis(request.domain, 'terms'),
            storage.getTermsAnalysis(request.domain, 'privacy'),
            storage.getTermsAnalysis(request.domain, 'manual_selection')
        ]).then(([t, p, m]) => {
            let score = 0;
            if (t) score = Math.max(score, t.risk_score || 0);
            if (p) score = Math.max(score, p.risk_score || 0);
            if (m) score = Math.max(score, m.risk_score || 0);

            // If all are missing, return undefined to signal 'no analysis'
            if (!t && !p && !m) score = undefined;

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

    if (request.action === 'get_analysis_status') {
        sendResponse({
            isAnalyzing: termsManager.isAnalyzing
        });
        return true;
    }

    if (request.action === 'get_term_analysis') {
        Promise.all([
            storage.getTermsAnalysis(request.domain, 'terms'),
            storage.getTermsAnalysis(request.domain, 'manual_selection')
        ]).then(([terms, manual]) => {
            if (!terms && !manual) {
                sendResponse(null);
                return;
            }
            if (terms && !manual) {
                sendResponse(terms);
                return;
            }
            if (!terms && manual) {
                sendResponse(manual);
                return;
            }
            // Both exist, return fresher
            const tTime = terms.timestamp || 0;
            const mTime = manual.timestamp || 0;
            sendResponse(tTime > mTime ? terms : manual);
        });
        return true;
    }

    if (request.action === 'get_domain_status') {
        storage.getAnalysisState(request.domain)
            .then(state => sendResponse(state || { status: 'idle' }));
        return true;
    }
});

// Context Menu Logic
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "analyze-text",
            title: "Analyze with TrustLayer",
            contexts: ["selection"]
        });
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "analyze-text" && info.selectionText) {

        console.log("Context Menu clicked. Text selected:", info.selectionText.substring(0, 50) + "...");

        // Notify User: Analysis Started (Check if API exists)
        if (chrome.notifications && chrome.notifications.create) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'TrustLayer Analysis Started',
                message: 'Analyzing your selection... Open the extension to view results.',
                priority: 2
            });
        } else {
            console.log("Notifications API not available.");
        }

        const domain = new URL(tab.url).hostname;
        termsManager.analyzeText(info.selectionText, domain, 'manual_selection', (current, total) => {
            console.log(`Analysis Progress: ${current}/${total}`);
            chrome.runtime.sendMessage({
                action: 'terms_progress',
                current: current,
                total: total
            }).catch(() => { });
        }).then((result) => {
            // successful completion
            console.log("Analysis Complete:", result);
            chrome.runtime.sendMessage({
                action: 'terms_complete',
                domain: domain,
                result: result
            }).catch(() => { });

            // Notification update
            if (chrome.notifications && chrome.notifications.create) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'TrustLayer Analysis Complete',
                    message: `Risk Score: ${result.risk_score}/100. Click to view details.`,
                    priority: 2
                });
            }
        }).catch(err => {
            console.error("Analysis Error:", err);
            chrome.runtime.sendMessage({
                action: 'terms_error',
                domain: domain,
                error: err.message
            }).catch(() => { });
        });
    }
});

