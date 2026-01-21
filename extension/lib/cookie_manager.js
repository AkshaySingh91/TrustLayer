export class CookieManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.mlEndpoint = 'http://127.0.0.1:8000/analyze';
    }

    generateCookieId(cookie) {
        return `${cookie.domain}::${cookie.name}::${cookie.path}`;
    }

    async handleCookieChange(changeInfo) {
        const { cookie, removed } = changeInfo;

        if (removed) return;

        const cookieId = this.generateCookieId(cookie);

        // Check existing
        const existingData = await this.storage.getCookie(cookieId);

        if (existingData && existingData.analysis) {
            // Already analyzed. Enforce block if needed.
            if (existingData.userAction === 'block') {
                this.removeCookie(cookie);
            }
            return;
        }

        // New or unanalyzed.
        const metadata = this.extractMetadata(cookie);

        // 1. Save Pending State
        const pendingRecord = {
            id: cookieId,
            raw: metadata,
            analysis: null, // Pending
            timestamp: Date.now(),
            userAction: 'allow'
        };
        await this.storage.saveCookie(pendingRecord);

        // Notify UI
        // 2. Notify UI (Safe send)
        this.safeSendMessage({ action: 'cookie_update', id: cookieId });

        // 3. NO AUTO ANALYSIS - User must trigger it
    }

    safeSendMessage(message) {
        try {
            chrome.runtime.sendMessage(message).catch(() => { });
        } catch (e) {
            // Popup is closed, ignore.
        }
    }

    extractMetadata(cookie) {
        return {
            name: cookie.name,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            session: cookie.session,
            expirationDate: cookie.expirationDate
        };
    }

    async analyzeCookie(id, metadata) {
        try {
            const response = await fetch(this.mlEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metadata)
            });

            if (!response.ok) throw new Error('ML Service analysis failed');

            const analysis = await response.json();

            const record = await this.storage.getCookie(id);
            if (record) {
                record.analysis = analysis;
                await this.storage.saveCookie(record);


                this.safeSendMessage({ action: 'cookie_update', id: id });
            }
        } catch (error) {
            console.error('Error analyzing cookie:', error);
        }
    }

    /**
     * Analyze all pending cookies for a specific domain.
     * @param {string} domain - The domain to analyze (e.g., "google.com")
     * @param {function} onProgress - Callback(current, total)
     */
    async analyzeDomain(domain, onProgress) {
        const allCookies = await this.storage.getAllCookies();

        // Filter: match domain AND not analyzed
        const targetCookies = allCookies.filter(c => {
            if (!c.raw || !c.raw.domain) return false;
            const cDomain = c.raw.domain.startsWith('.') ? c.raw.domain.slice(1) : c.raw.domain;
            return (domain.endsWith(cDomain) || cDomain.endsWith(domain)) && !c.analysis;
        });

        if (targetCookies.length === 0) return { count: 0 };

        let processed = 0;
        // Process sequentially to be nice to the local LLM
        for (const cookie of targetCookies) {
            if (onProgress) onProgress(processed + 1, targetCookies.length);

            await this.analyzeCookie(cookie.id, cookie.raw);
            processed++;
        }

        return { count: processed };
    }



    removeCookie(cookie) {
        // Safety check for required fields
        if (!cookie || !cookie.domain || !cookie.name) return;

        const protocol = cookie.secure ? "https:" : "http:";
        const url = `${protocol}//${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}${cookie.path}`;

        chrome.cookies.remove({
            url: url,
            name: cookie.name
        });
    }

    async updateCookieStatus(id, status) {
        const cookieData = await this.storage.getCookie(id);
        if (!cookieData) return;

        if (status !== 'delete') {
            cookieData.userAction = status;
            await this.storage.saveCookie(cookieData);
        }

        if (status === 'block' && cookieData.raw) {
            this.removeCookie(cookieData.raw);
        }
        else if (status === 'delete' && cookieData.raw) {
            this.removeCookie(cookieData.raw);
            // We do not save 'delete' state, so if it comes back, it's analyzed again (or we could persist a 'deleted' state if preferred).
            // Current approach: Delete is immediate removal, no memory.
        }
    }
}
