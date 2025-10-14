// ============================================================
// 🔧 Background Service Worker - FastAPI Backend Integration
// ============================================================

const BACKEND_URL = 'http://localhost:8000';
let analysisCache = new Map();
let isProcessing = false;
let animTimer = null;
let animFrame = 0;
const animFrames = 8;

console.log('🚀 Terms & Conditions AI Analyzer - Background Service Worker Loaded');

chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed/updated:', details.reason);
    
    chrome.storage.local.set({
        analyses: [],
        settings: {
            backend_url: BACKEND_URL,
            auto_detect: true,
            show_notifications: true
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request.action);

    switch (request.action) {
        case 'analyze_content':
            handleContentAnalysis(request, sendResponse);
            return true;

        case 'get_analysis_data':
            handleGetAnalysisData(request, sendResponse);
            return true;

        case 'check_backend_status':
            handleBackendStatusCheck(sendResponse);
            return true;

        case 'clear_cache':
            handleClearCache(sendResponse);
            return true;

        case 'auto_detect_tc_link':
            handleAutoDetectTcLink(request, sender, sendResponse);
            return true;

        case 'clear_badge':
            clearBadge(sender, sendResponse);
            return true;

        default:
            console.warn('Unknown action:', request.action);
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

async function handleContentAnalysis(request, sendResponse) {
    if (isProcessing) {
        sendResponse({ success: false, error: 'Analysis already in progress' });
        return;
    }

    try {
        isProcessing = true;
        
        const { content, url, language = 'en' } = request;
        console.log(`🔍 Analyzing content from: ${url} (Language: ${language})`);
        console.log(`📄 Content length: ${content.length} characters`);

        const cacheKey = generateCacheKey(content + language);
        if (analysisCache.has(cacheKey)) {
            console.log('📋 Using cached analysis');
            const cachedResult = analysisCache.get(cacheKey);
            await storeAnalysis(cachedResult, url);
            sendResponse({ success: true, data: cachedResult });
            return;
        }

        const analysisResult = await analyzeWithBackend(content, language);
        
        if (analysisResult.success) {
            analysisCache.set(cacheKey, analysisResult.data);
            await storeAnalysis(analysisResult.data, url);
            showNotification(analysisResult.data.risk_analysis.risk_level, url);
            
            console.log('✅ Analysis completed successfully');
            sendResponse({ success: true, data: analysisResult.data });
        } else {
            console.error('❌ Analysis failed:', analysisResult.error);
            sendResponse({ success: false, error: analysisResult.error });
        }

    } catch (error) {
        console.error('💥 Analysis error:', error);
        sendResponse({ success: false, error: error.message });
    } finally {
        isProcessing = false;
    }
}

async function analyzeWithBackend(content, language = 'en') {
    try {
        console.log('🔗 Calling FastAPI backend (/analyze)...');
        
        const response = await fetch(`${BACKEND_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                content: content,
                language: language 
            })
        });

        if (!response.ok) {
            throw new Error(`Backend server responded with ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Backend response received:', result);
        
        // main_simple.py returns { success: true, data: {...} }
        if (result && result.success && result.data && result.data.summary && result.data.risk_analysis) {
            return { success: true, data: result.data };
        }
        // Fallback for direct response format
        if (result && result.summary && result.risk_analysis) {
            return { success: true, data: result };
        }
        throw new Error('Backend analysis failed: invalid response');

    } catch (error) {
        console.error('🚨 Backend communication error:', error);
        
        return {
            success: false,
            error: `Backend connection failed: ${error.message}. Please ensure your FastAPI server is running on ${BACKEND_URL}`
        };
    }
}

async function analyzeUrlWithBackend(url, language = 'en') {
    try {
        console.log('🔗 Calling FastAPI backend (/analyze_url)...');
        const response = await fetch(`${BACKEND_URL}/analyze_url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                url: url,
                language: language 
            })
        });

        if (!response.ok) {
            throw new Error(`Backend server responded with ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Backend URL response received');
        
        if (result && result.summary && result.risk_analysis) {
            return { success: true, data: result };
        }
        if (result && result.success && result.data && result.data.summary && result.data.risk_analysis) {
            return { success: true, data: result.data };
        }
        throw new Error('Backend URL analysis failed: invalid response');

    } catch (error) {
        console.error('🚨 Backend URL communication error:', error);
        return { success: false, error: `Backend URL connection failed: ${error.message}` };
    }
}

async function handleGetAnalysisData(request, sendResponse) {
    try {
        const result = await chrome.storage.local.get(['analyses']);
        const analyses = result.analyses || [];
        
        let targetAnalysis = null;
        
        if (request.url) {
            // Try exact URL match first
            targetAnalysis = analyses.find(a => a.url === request.url);
            if (!targetAnalysis) {
                // Try domain match
                try {
                    const reqDomain = new URL(request.url).hostname;
                    const domainMatches = analyses.filter(a => a.domain === reqDomain);
                    if (domainMatches.length > 0) {
                        targetAnalysis = domainMatches[domainMatches.length - 1];
                    }
                } catch {}
            }
        }
        if (!targetAnalysis) {
            // Fallback to latest overall
            targetAnalysis = analyses[analyses.length - 1];
        }

        sendResponse({ success: true, data: targetAnalysis });
    } catch (error) {
        console.error('Error retrieving analysis data:', error);
        sendResponse({ success: false, error: error.message });
    }
}

async function handleBackendStatusCheck(sendResponse) {
    try {
        const response = await fetch(`${BACKEND_URL}/`, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            sendResponse({ success: true, status: 'connected', backend_url: BACKEND_URL });
        } else {
            sendResponse({ success: false, status: 'error', error: 'Backend not responding' });
        }
    } catch (error) {
        sendResponse({ 
            success: false, 
            status: 'disconnected', 
            error: `Cannot connect to backend at ${BACKEND_URL}. Please start your FastAPI server.`
        });
    }
}

function handleClearCache(sendResponse) {
    analysisCache.clear();
    chrome.storage.local.set({ analyses: [] });
    console.log('🗑️ Cache cleared');
    sendResponse({ success: true });
}

async function storeAnalysis(analysisData, url) {
    try {
        const result = await chrome.storage.local.get(['analyses']);
        const analyses = result.analyses || [];
        
        const newAnalysis = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            url: url,
            domain: new URL(url).hostname,
            summary: analysisData.summary,
            risk_analysis: analysisData.risk_analysis,
            source_url: analysisData.source_url || url,
            processed_at: new Date().toLocaleString()
        };
        
        analyses.push(newAnalysis);
        if (analyses.length > 10) {
            analyses.shift();
        }
        
        await chrome.storage.local.set({ analyses: analyses });
        console.log('💾 Analysis stored successfully');
        
    } catch (error) {
        console.error('Storage error:', error);
    }
}

function showNotification(riskLevel, url) {
    const domain = new URL(url).hostname;
    
    const notifications = {
        'HIGH': {
            title: '⚠️ High Risk Terms Detected!',
            message: `Terms from ${domain} contain high-risk clauses that require your attention.`,
            iconUrl: 'icons/icon48.png'
        },
        'MEDIUM': {
            title: '🔶 Medium Risk Terms Found',
            message: `Terms from ${domain} contain some concerning clauses. Review recommended.`,
            iconUrl: 'icons/icon48.png'
        },
        'LOW': {
            title: '✅ Low Risk Terms',
            message: `Terms from ${domain} appear to be relatively safe.`,
            iconUrl: 'icons/icon48.png'
        },
        'VERY LOW': {
            title: '✅ Very Safe Terms',
            message: `Terms from ${domain} are consumer-friendly with minimal risks.`,
            iconUrl: 'icons/icon48.png'
        }
    };

    const notification = notifications[riskLevel] || notifications['MEDIUM'];
    
    chrome.notifications.create({
        type: 'basic',
        iconUrl: notification.iconUrl,
        title: notification.title,
        message: notification.message
    });
}

function generateCacheKey(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

async function handleAutoDetectTcLink(request, sender, sendResponse) {
    try {
        const tcUrl = request.tcUrl;
        const language = request.language || 'en';
        if (!tcUrl) {
            sendResponse({ success: false, error: 'No TC URL provided' });
            return;
        }

        const analysisResult = await analyzeUrlWithBackend(tcUrl, language);
        if (!analysisResult.success) {
            sendResponse({ success: false, error: analysisResult.error });
            return;
        }

        const pageUrl = sender?.tab?.url || tcUrl;
        await storeAnalysis(analysisResult.data, pageUrl);

        // Badge indicator on originating tab
        if (sender?.tab?.id) {
            await chrome.action.setBadgeBackgroundColor({ color: '#28a745', tabId: sender.tab.id });
            await chrome.action.setBadgeText({ text: '✓', tabId: sender.tab.id });
        }

        // Optional notification
        const riskLevel = analysisResult.data?.risk_analysis?.risk_level;
        showNotification(riskLevel, pageUrl);

        sendResponse({ success: true, data: analysisResult.data });
    } catch (e) {
        console.error('Auto-detect error:', e);
        sendResponse({ success: false, error: e.message });
    }
}

function clearBadge(sender, sendResponse) {
    try {
        if (sender?.tab?.id) {
            chrome.action.setBadgeText({ text: '', tabId: sender.tab.id });
        }
        sendResponse && sendResponse({ success: true });
    } catch (e) {
        console.error('Clear badge error:', e);
        sendResponse && sendResponse({ success: false });
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log(`📄 Tab updated: ${tab.url}`);
    }
});

self.addEventListener('error', (error) => {
    console.error('💥 Unhandled error in background script:', error);
});

setInterval(() => {
    console.log('🔄 Background service worker heartbeat');
}, 30000);

console.log('✅ Background script fully initialized');

// ------------------------------------------------------------
// Auto trigger on navigation
// ------------------------------------------------------------
chrome.webNavigation.onCompleted.addListener(async (details) => {
    try {
        if (details.frameId !== 0) return;
        const urlObj = new URL(details.url);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return;

        const domain = urlObj.hostname;

        // Avoid re-analyzing same domain within 24h
        const store = await chrome.storage.local.get(['domainAnalysisTimestamps']);
        const timestamps = store.domainAnalysisTimestamps || {};
        const lastTs = timestamps[domain];
        const now = Date.now();
        if (lastTs && (now - lastTs) < 24 * 60 * 60 * 1000) {
            return;
        }

        // Start animation while we work
        startIconAnimation(details.tabId);

        const policyUrls = await findPolicyUrls(urlObj.origin);
        let analyzedSourceUrl = null;
        let combinedText = '';

        if (policyUrls && policyUrls.length) {
            const topCandidates = policyUrls.slice(0, 2);
            const contents = await fetchPolicies(topCandidates);
            if (contents.length) {
                combinedText = contents.join('\n\n');
                analyzedSourceUrl = topCandidates[0];
            }
        }

        // Fallback: analyze current page if no policy text was found
        if (!combinedText) {
            const currentText = await fetchSinglePageText(details.url);
            if (currentText && currentText.length > 500) {
                combinedText = currentText;
                analyzedSourceUrl = details.url;
            }
        }

        if (!combinedText) {
            stopIconAnimation(details.tabId, false);
            return;
        }

        const analysis = await analyzeWithBackend(combinedText, 'en');
        if (analysis.success) {
            // propagate the actual analyzed source url for popup display
            analysis.data.source_url = analyzedSourceUrl || urlObj.origin;
            await storeAnalysis(analysis.data, analyzedSourceUrl || urlObj.origin);
            // Mark domain timestamp
            timestamps[domain] = now;
            await chrome.storage.local.set({ domainAnalysisTimestamps: timestamps });
            stopIconAnimation(details.tabId, true);
        } else {
            stopIconAnimation(details.tabId, false);
        }
    } catch (e) {
        console.error('Auto navigation analysis error:', e);
    }
});

// ------------------------------------------------------------
// Simple crawler: fetch homepage, extract policy links
// ------------------------------------------------------------
async function findPolicyUrls(origin) {
    try {
        const homeUrl = origin;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(homeUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return [];
        const html = await res.text();
        const links = Array.from(html.matchAll(/href\s*=\s*"([^"]+)"/gi)).map(m => m[1]);
        const toAbs = (href) => {
            try { return new URL(href, origin).href; } catch { return null; }
        };
        const absLinks = links.map(toAbs).filter(Boolean);
        const patterns = /(terms|terms-of-service|tos|privacy|privacy-policy|policy|legal|agreement)/i;
        const candidates = absLinks.filter(l => patterns.test(l));
        const unique = Array.from(new Set(candidates));
        // Prioritize explicit paths
        const priorityOrder = [
            /\/terms(\/|$)/i,
            /\/terms-of-service(\/|$)/i,
            /\/privacy(\/|$)/i,
            /\/privacy-policy(\/|$)/i,
            /\/legal(\/|$)/i,
            /\/policy(\/|$)/i
        ];
        unique.sort((a, b) => {
            const sa = priorityOrder.findIndex(r => r.test(a));
            const sb = priorityOrder.findIndex(r => r.test(b));
            return (sa === -1 ? 999 : sa) - (sb === -1 ? 999 : sb);
        });
        return unique;
    } catch (e) {
        return [];
    }
}

// Fetch policy pages with timeouts
async function fetchPolicies(urls) {
    const texts = [];
    for (const url of urls) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) continue;
            const html = await res.text();
            // crude text extraction: strip tags
            const text = html
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (text && text.length > 500) texts.push(text);
        } catch (e) {
            // skip
        }
    }
    return texts;
}

async function fetchSinglePageText(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return '';
        const html = await res.text();
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    } catch (e) { return ''; }
}

// Icon animation helpers
function startIconAnimation(tabId) {
    if (animTimer) return;
    animFrame = 0;
    animTimer = setInterval(() => {
        const path = `icons/icon_loading_${animFrame}.png`;
        chrome.action.setIcon({ path, tabId });
        animFrame = (animFrame + 1) % animFrames;
    }, 120);
}

function stopIconAnimation(tabId, success) {
    if (animTimer) {
        clearInterval(animTimer);
        animTimer = null;
    }
    if (success) {
        chrome.action.setIcon({ path: 'icons/icon_done.png', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#28a745', tabId });
        chrome.action.setBadgeText({ text: '✓', tabId });
    } else {
        chrome.action.setIcon({ path: 'icons/icon48.png', tabId });
        chrome.action.setBadgeText({ text: '', tabId });
    }
}