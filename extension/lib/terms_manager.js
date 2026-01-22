export class TermsManager {
    constructor(storage) {
        this.storage = storage;
        this.endpoint = 'http://127.0.0.1:8000/analyze_terms';
        this.isAnalyzing = false;
        this.progressCallback = null;
    }

    async scanForLinks(tabId) {
        // Execute script in tab to find links
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    const keywords = ['terms', 'privacy', 'policy', 'agreement', 'legal', 'service'];
                    const links = Array.from(document.querySelectorAll('a'));
                    return links
                        .map(a => ({
                            text: a.innerText.trim(),
                            href: a.href,
                            rect: a.getBoundingClientRect()
                        }))
                        .filter(a => {
                            const text = a.text.toLowerCase();
                            return keywords.some(k => text.includes(k)) && a.href.startsWith('http');
                        })
                        .slice(0, 5); // Limit to top 5
                }
            });
            return results[0].result;
        } catch (e) {
            console.error('Scan failed:', e);
            return [];
        }
    }

    async getTextFromTab(tabId) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    // Smart extraction: Ignore scripts, styles, hidden elements
                    const clone = document.body.cloneNode(true);

                    // Remove noise
                    const noiseTags = ['script', 'style', 'noscript', 'iframe', 'svg', 'header', 'footer', 'nav'];
                    noiseTags.forEach(tag => {
                        const elements = clone.querySelectorAll(tag);
                        elements.forEach(el => el.remove());
                    });

                    return clone.innerText.trim();
                }
            });
            return results[0].result;
        } catch (e) {
            console.error('Text extraction failed:', e);
            return null;
        }
    }

    async fetchAndValidate(url) {
        try {
            const res = await fetch(url);
            const html = await res.text();

            // Basic validation
            const wordCount = html.split(/\s+/).length;
            if (wordCount < 500) return { valid: false, reason: "Too short (< 500 words)" };

            // Check keywords
            const lower = html.toLowerCase();
            const keywords = ['user agreement', 'privacy policy', 'terms of use', 'collect', 'personal data'];
            const hasKeywords = keywords.some(k => lower.includes(k));

            if (!hasKeywords) return { valid: false, reason: "No legal keywords found" };

            return { valid: true, html };
        } catch (e) {
            return { valid: false, reason: "Fetch failed" };
        }
    }

    extractContent(html) {
        // Simple regex-based extraction to avoid full DOM parser in background if possible, 
        // but DOMParser is available in Service Worker in MV3? Yes.
        // Actually, let's use a simpler text cleaning approach to be safe and fast.

        // Remove script/style
        let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<[^>]+>/g, ' '); // Strip tags
        text = text.replace(/\s+/g, ' ').trim(); // Normalize whitespace

        return text;
    }

    chunkText(text) {
        const words = text.split(' ');
        const chunks = [];
        const chunkSize = 400;

        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push(words.slice(i, i + chunkSize).join(' '));
        }
        return chunks;
    }

    async analyze(url, type, onProgress) {
        if (this.isAnalyzing) throw new Error("Analysis already in progress");
        this.isAnalyzing = true;
        this.progressCallback = onProgress;

        try {
            // Check Cache
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const cached = await this.storage.getTermsAnalysis(domain, type);
            if (cached) return cached;

            // Fetch & Validate
            const validation = await this.fetchAndValidate(url);
            if (!validation.valid) throw new Error(validation.reason);

            // Extract
            const text = this.extractContent(validation.html);

            // Delegate to text analyzer (but we must unlock isAnalyzing first as we are inside it)
            // actually easier to just move core logic here or refactor.
            // Let's refactor cleanly.
            const chunks = this.chunkText(text);
            if (chunks.length === 0) throw new Error("No content extracted");

            const results = await this._processChunks(chunks);
            const finalResult = this.aggregateResults(results, domain, type, url);
            await this.storage.saveTermsAnalysis(finalResult);
            return finalResult;

        } finally {
            this.isAnalyzing = false;
        }
    }

    async analyzeText(text, domain, type, onProgress) {
        if (this.isAnalyzing) throw new Error("Analysis already in progress");
        this.isAnalyzing = true;
        this.progressCallback = onProgress;

        // 1. Set Persistent State: Analyzing
        await this.storage.setAnalysisState(domain, 'analyzing', 0);

        try {
            // Check Cache first
            const cached = await this.storage.getTermsAnalysis(domain, type);
            if (cached) {
                await this.storage.setAnalysisState(domain, 'completed', 100);
                return cached;
            }

            const chunks = this.chunkText(text);
            if (chunks.length === 0) throw new Error("No content extracted");

            const results = await this._processChunks(chunks, domain);
            const finalResult = this.aggregateResults(results, domain, type, "current_tab");
            await this.storage.saveTermsAnalysis(finalResult);

            // 2. Set Persistent State: Completed
            await this.storage.setAnalysisState(domain, 'completed', 100);
            return finalResult;
        } catch (e) {
            // 3. Set Persistent State: Error
            await this.storage.setAnalysisState(domain, 'error', 0, e.message);
            throw e;
        } finally {
            this.isAnalyzing = false;
        }
    }

    async _processChunks(chunks, domain) {
        const results = [];
        for (let i = 0; i < chunks.length; i++) {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: chunks[i] })
            });

            if (response.ok) {
                const data = await response.json();
                results.push(data);

                // Report progress only after success
                if (this.progressCallback) this.progressCallback(i + 1, chunks.length);

                // Update Persistent Progress
                if (domain) {
                    await this.storage.setAnalysisState(domain, 'analyzing', (i + 1) / chunks.length);
                }
            }
        }
        return results;
    }

    aggregateResults(results, domain, type, url) {
        let totalScore = 0;
        const allClauses = new Set();
        const allFlags = new Set();
        let explanations = [];

        results.forEach(r => {
            totalScore += (r.risk_score || 0);
            if (r.identified_clauses) r.identified_clauses.forEach(c => allClauses.add(c));
            if (r.risk_flags) r.risk_flags.forEach(f => allFlags.add(f));
            if (r.explanation) explanations.push(r.explanation);
        });

        const avgScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;

        // Simple Summary: Take top 3 unique explanations
        const summary = [...new Set(explanations)].slice(0, 5);

        return {
            id: `${domain}::${type}`,
            domain,
            type,
            url,
            risk_score: avgScore,
            clauses: Array.from(allClauses),
            flags: Array.from(allFlags),
            summary: summary,
            timestamp: Date.now()
        };
    }
}
