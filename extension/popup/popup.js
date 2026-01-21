document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('cookie-list');
    const totalEl = document.getElementById('total-cookies'); // Now "Analyzed" count
    const riskLabelEl = totalEl.nextElementSibling;
    const highRiskEl = document.getElementById('high-risk');

    // Inject Health Indicator
    const header = document.querySelector('header');
    if (header) {
        const headerTop = header.querySelector('.header-top') || header;
        const existingBadge = headerTop.querySelector('.status-badge');
        if (existingBadge) existingBadge.remove(); // cleanup old

        let healthEl = headerTop.querySelector('.health-indicator');
        if (!healthEl) {
            healthEl = document.createElement('div');
            healthEl.className = 'health-indicator offline';
            healthEl.innerHTML = '<div class="health-dot"></div><span>Offline</span>';
            headerTop.appendChild(healthEl);
        }
    }

    let currentUrl = null;
    let backendStatus = 'offline'; // 'online', 'starting', 'unstable', 'offline'

    // Get current tab URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
        currentUrl = tabs[0].url;
        if (riskLabelEl) riskLabelEl.textContent = "Analyzed";
    }

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('main').forEach(m => {
                m.classList.add('view-hidden');
                m.classList.remove('view-active');
            });

            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`${tabId}-view`).classList.remove('view-hidden');
            document.getElementById(`${tabId}-view`).classList.add('view-active');
        });
    });

    // T&C Logic
    const scanBtn = document.getElementById('scan-terms-btn');
    const linksList = document.getElementById('terms-links-list');
    const progressEl = document.getElementById('terms-progress');
    const resultEl = document.getElementById('terms-result');

    if (scanBtn) {
        // Intelligence: Check if current page IS a Terms page
        const isTermsPage = currentUrl && ['terms', 'privacy', 'policy', 'agreement'].some(k => currentUrl.toLowerCase().includes(k));

        if (isTermsPage) {
            scanBtn.innerText = "Analyze This Page";
            scanBtn.classList.add('btn-highlight'); // We can add some glow
            document.getElementById('terms-discovery').querySelector('p').innerText = "This looks like a legal document. Run deep analysis?";
        }

        scanBtn.addEventListener('click', async () => {
            if (scanBtn.innerText.includes("Analyze This Page")) {
                // Direct Analysis
                startAnalysis(currentUrl, true);
            } else {
                // Link Discovery
                scanBtn.disabled = true;
                scanBtn.innerText = "Scanning...";
                linksList.innerHTML = '';

                try {
                    const response = await chrome.runtime.sendMessage({ action: 'scan_terms' });
                    if (response.links && response.links.length > 0) {
                        renderLinks(response.links);
                    } else {
                        linksList.innerHTML = '<div style="padding:10px; color:var(--text-secondary)">No legal pages found.</div>';
                    }
                } catch (e) {
                    linksList.innerHTML = '<div style="color:var(--danger)">Scan failed.</div>';
                } finally {
                    scanBtn.disabled = false;
                    scanBtn.innerText = "Scan for Legal Pages";
                }
            }
        });
    }

    function renderLinks(links) {
        linksList.innerHTML = '';
        links.forEach(link => {
            const div = document.createElement('div');
            div.className = 'link-item';
            div.innerHTML = `
                <div style="font-weight:600; font-size:13px;">${link.text}</div>
                <div style="font-size:11px; opacity:0.7; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${link.href}</div>
            `;
            div.onclick = () => startAnalysis(link.href);
            linksList.appendChild(div);
        });
    }

    async function startAnalysis(url, isCurrentPage = false) {
        document.getElementById('terms-discovery').classList.add('hidden');
        progressEl.classList.remove('hidden');
        resultEl.classList.add('hidden');

        try {
            const action = isCurrentPage ? 'analyze_current_page' : 'analyze_terms';
            const response = await chrome.runtime.sendMessage({
                action: action,
                url: url,
                domain: new URL(currentUrl).hostname, // Always current domain context
                type: 'terms'
            });

            if (response.error) throw new Error(response.error);

            renderTermsResult(response.result);

        } catch (e) {
            progressEl.classList.add('hidden');
            document.getElementById('terms-discovery').classList.remove('hidden');
            alert("Analysis failed: " + e.message);
        }
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'terms_progress') {
            const pct = Math.round((msg.current / msg.total) * 100);
            document.getElementById('progress-text').innerText = `${pct}%`;
            document.getElementById('progress-fill').style.width = `${pct}%`;
        }
        if (msg.action === 'analysis_progress') {
            const pct = Math.round((msg.current / msg.total) * 100);
            const progressBar = document.getElementById('analysis-progress');
            const btn = document.getElementById('btn-analyze-cookies');

            if (progressBar && btn) {
                btn.style.display = 'none';
                progressBar.style.display = 'block';
                document.getElementById('cookie-progress-text').innerText = `${msg.current}/${msg.total}`;
                document.getElementById('cookie-progress-fill').style.width = `${pct}%`;
            }
        }
    });

    // Analyze Cookies Logic
    const analyzeCookiesBtn = document.getElementById('btn-analyze-cookies');
    if (analyzeCookiesBtn) {
        analyzeCookiesBtn.addEventListener('click', async () => {
            if (!currentUrl) return;
            const domain = new URL(currentUrl).hostname;

            analyzeCookiesBtn.disabled = true;
            analyzeCookiesBtn.innerText = "Starting...";

            try {
                await chrome.runtime.sendMessage({ action: 'analyze_domain', domain: domain });
                // We rely on progress events to update UI
            } catch (e) {
                alert("Analysis failed start: " + e.message);
                analyzeCookiesBtn.disabled = false;
                analyzeCookiesBtn.innerText = "Analyze Cookies";
            }
        });
    }

    function renderTermsResult(result) {
        progressEl.classList.add('hidden');
        resultEl.classList.remove('hidden');

        const score = result.risk_score;
        let riskLevel = 'Low';
        let riskClass = 'low';
        if (score > 30) { riskLevel = 'Medium'; riskClass = 'medium'; }
        if (score > 60) { riskLevel = 'High'; riskClass = 'high'; }

        resultEl.innerHTML = `
            <div class="result-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="risk-level-badge ${riskClass}">${riskLevel} Risk</span>
                    <span style="font-weight:bold; font-size:14px;">Score: ${score}</span>
                </div>
                <h3 style="margin:8px 0; font-size:14px;">Summary</h3>
                <ul style="padding-left:20px; font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                    ${result.summary.map(s => `<li>${s}</li>`).join('')}
                </ul>
                <h3 style="margin:8px 0; font-size:14px;">Flagged Risks</h3>
                <div style="font-size:12px; color:var(--warning);">
                    ${result.flags.slice(0, 3).join(', ')}
                </div>
                <button onclick="location.reload()" class="primary-btn" style="margin-top:16px;">Close</button>
            </div>
        `;
    }

    // Initial Load - Listeners already added above
    await fetchAndRender();
    updateHealth();

    // Listen for updates
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'cookie_update') {
            fetchAndRender();
        }
        if (msg.action === 'health_update') {
            updateHealthState(msg.payload);
        }
    });

    // Polling health immediately
    async function updateHealth() {
        try {
            const healthPayload = await chrome.runtime.sendMessage({ action: 'getHealth' });
            updateHealthState(healthPayload);
        } catch (e) {
            updateHealthState({ status: 'offline', details: null });
        }
    }

    function updateHealthState(payload) {
        // Payload: { status: 'online'|'offline'|..., details: {...} }
        const healthEl = document.querySelector('.health-indicator');
        if (!healthEl) return;

        const status = payload ? payload.status : 'offline';
        const details = payload ? payload.details : null;

        if (status === 'online') {
            healthEl.className = 'health-indicator active';
            healthEl.querySelector('span').innerText = 'System Active';
        } else if (status === 'starting') {
            healthEl.className = 'health-indicator starting';
            const uptime = details ? details.uptime_sec : 0;
            healthEl.querySelector('span').innerText = `Starting (${Math.round(uptime)}s)...`;
        } else if (status === 'unstable') {
            healthEl.className = 'health-indicator unstable';
            healthEl.querySelector('span').innerText = 'Connecting...';
        } else {
            healthEl.className = 'health-indicator offline';
            healthEl.querySelector('span').innerText = 'Offline Mode';
        }

        if (backendStatus !== status) {
            backendStatus = status;
            fetchAndRender();
        }
    }

    async function fetchAndRender() {
        // Request data filtered by URL
        try {
            const cookies = await chrome.runtime.sendMessage({ action: 'getCookies', url: currentUrl });

            if (!cookies || cookies.length === 0) {
                listContainer.innerHTML = '<div class="empty">No cookies detected for this site.</div>';
                totalEl.innerText = "0/0";
                highRiskEl.innerText = "0";
                // Even with no cookies, we might have T&C check
                // calculateAndShowGrade([], new URL(currentUrl).hostname); 
                return;
            }

            renderCookies(cookies);

            // Calculate Global Score
            if (currentUrl) {
                const domain = new URL(currentUrl).hostname;
                calculateAndShowGrade(cookies, domain);
            }

        } catch (e) {
            // Extension context invalidated or communication error
        }
    }

    async function calculateAndShowGrade(cookies, domain) {
        // 1. Cookie Risk
        let totalCookieRisk = 0;
        let count = 0;
        cookies.forEach(c => {
            if (c.analysis && c.analysis.risk_score) {
                totalCookieRisk += c.analysis.risk_score;
                count++;
            }
        });
        const avgCookieRisk = count > 0 ? (totalCookieRisk / count) : 0;

        // 2. Terms Risk
        // We need to ask background for cached terms
        let termsRisk = 0;
        let hasTerms = false;
        try {
            const termsRes = await chrome.runtime.sendMessage({ action: 'get_terms_risk', domain: domain });
            if (termsRes && termsRes.risk_score !== undefined) {
                termsRisk = termsRes.risk_score;
                hasTerms = true;
            }
        } catch (e) { }

        // 3. Global Score
        // If T&C exists: 60% Cookie, 40% T&C
        // Else: 100% Cookie
        let globalScore = 0;
        if (hasTerms) {
            globalScore = (avgCookieRisk * 0.6) + (termsRisk * 0.4);
        } else {
            globalScore = avgCookieRisk;
        }

        globalScore = Math.round(globalScore);

        // 4. Update Badge
        const badge = document.getElementById('trust-grade');
        const letter = document.getElementById('grade-letter');

        let grade = 'A';
        if (globalScore > 10) grade = 'B';
        if (globalScore > 30) grade = 'C';
        if (globalScore > 50) grade = 'D';
        if (globalScore > 70) grade = 'F';

        if (badge && letter) {
            badge.className = `trust-grade-badge grade-${grade}`;
            letter.innerText = grade;
            badge.title = `Risk Score: ${globalScore}/100`;
            badge.classList.remove('hidden');
        }
    }

    function renderCookies(cookieData) {
        listContainer.innerHTML = '';
        let highRiskCount = 0;
        let analyzedCount = 0;
        let pendingCount = 0;

        // Sort: High risk first, then pending/analyzing, then others
        cookieData.sort((a, b) => {
            const riskA = a.analysis ? a.analysis.risk_score : -1;
            const riskB = b.analysis ? b.analysis.risk_score : -1;
            return riskB - riskA;
        });

        // Banner for offline mode
        if (backendStatus === 'offline') {
            const banner = document.createElement('div');
            banner.style.cssText = `
                background: rgba(220, 38, 38, 0.1); 
                border: 1px solid rgba(220, 38, 38, 0.2);
                color: #fca5a5;
                font-size: 11px;
                padding: 8px;
                border-radius: 8px;
                margin-bottom: 12px;
                text-align: center;
            `;
            banner.innerText = "Offline mode - showing last known analysis";
            listContainer.appendChild(banner);
        }

        cookieData.forEach(item => {
            const analysis = item.analysis;
            const isPending = !analysis;

            if (!isPending) analyzedCount++;

            const risk = isPending ? 0 : (analysis.risk_score || 0);

            // Map fields correctly
            const rawCategory = analysis ? (analysis.category || 'Unknown') : 'Unknown';
            const intent = analysis ? (analysis.cookie_intent || rawCategory) : 'Unknown';
            const confidence = isPending ? '' : (analysis.confidence_level || analysis.confidence || 'low');
            const explanation = analysis ? (analysis.explanation || analysis.description || 'No description available.') : '';

            if (!isPending && risk > 60) highRiskCount++;

            let riskClass = 'risk-low';
            if (isPending) riskClass = 'risk-pending';
            else if (risk > 30) riskClass = 'risk-medium';
            if (risk > 60) riskClass = 'risk-high';

            // Intent styling
            let intentClass = 'intent-unknown';
            const iLower = intent.toLowerCase();
            if (iLower.includes('auth')) intentClass = 'intent-auth';
            else if (iLower.includes('sec')) intentClass = 'intent-sec';
            else if (iLower.includes('track') || iLower.includes('ad')) intentClass = 'intent-track';
            else if (iLower.includes('ana')) intentClass = 'intent-adv';

            const card = document.createElement('div');
            card.className = `cookie-item ${riskClass}`;

            const isBlocked = item.userAction === 'block';
            const isAllowed = item.userAction === 'allow';

            // Status / Risk Visualization
            let statusHtml;
            if (isPending) {
                if (backendStatus === 'online') {
                    statusHtml = '<div class="loader"></div>';
                } else if (backendStatus === 'starting' || backendStatus === 'unstable') {
                    statusHtml = '<div class="loader" style="border-top-color: var(--warning)"></div>';
                } else {
                    statusHtml = '<div class="offline-icon" title="ML Service Offline">⚡</div>';
                }
            } else {
                // Risk Bar
                let barColor = 'low';
                if (risk > 30) barColor = 'med';
                if (risk > 60) barColor = 'high';
                statusHtml = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:12px; font-weight:700;">${risk}</span>
                        <div class="risk-bar-container">
                            <div class="risk-bar-fill ${barColor}" style="width: ${risk}%"></div>
                        </div>
                    </div>
                `;
            }

            // Description / Pending text
            let descHtml;
            if (isPending) {
                if (backendStatus === 'online') descHtml = 'Using Qwen2.5 to analyze...';
                else if (backendStatus === 'starting') descHtml = 'AI Engine starting up...';
                else if (backendStatus === 'unstable') descHtml = 'Connection unstable...';
                else descHtml = 'Analysis paused. Backend offline.';
            } else {
                descHtml = explanation;
            }

            card.innerHTML = `
                <div class="cookie-header">
                    <span class="cookie-domain">${item.raw.domain}</span>
                    <span class="risk-score">
                        ${statusHtml}
                    </span>
                </div>
                <div class="cookie-name">${item.raw.name}</div>
                <div class="cookie-desc">
                    ${descHtml}
                </div>
                <div class="cookie-meta">
                    <span class="intent-badge ${intentClass}">
                        ${intent} ${confidence ? `<small style="opacity:0.7; margin-left:4px;">(${confidence})</small>` : ''}
                    </span>
                    <div class="action-group">
                        <button class="action-btn allow ${isAllowed ? 'active' : ''}" 
                                data-id="${item.id}" data-action="allow">Allow</button>
                        <button class="action-btn block ${isBlocked ? 'active' : ''}" 
                                data-id="${item.id}" data-action="block" 
                                ${backendStatus !== 'online' ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Block</button>
                        <button class="action-btn delete" 
                                data-id="${item.id}" data-action="delete">Delete</button>
                    </div>
                </div>
            `;

            listContainer.appendChild(card);
        });

        // Add event listeners
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const action = e.target.getAttribute('data-action');

                // Allow delete in offline mode, but block/allow require online for analysis re-check usually, but for now we disable Block to be safe.
                // Actually allow/block logic in extension storage doesn't strictly need backend, but we'll stick to disabling Block if offline per requirements
                // "Disable analysis buttons" - allow/block are effectively final decisions, but Block implies auto-block logic which might need ML. 
                // Plan said: "Controls: Disable Block/Analyze buttons if not ready. Allow delete."

                if (backendStatus !== 'online' && action === 'block') return;

                if (action === 'delete') {
                    const card = e.target.closest('.cookie-item');
                    card.style.opacity = '0.5';
                    card.style.pointerEvents = 'none';
                }

                await chrome.runtime.sendMessage({
                    action: 'updateCookieStatus',
                    cookieId: id,
                    status: action
                });

                // Allow a small delay for delete to process before refreshing
                setTimeout(fetchAndRender, 100);
            });
        });

        totalEl.innerText = `${analyzedCount}/${cookieData.length}`;
        highRiskEl.innerText = highRiskCount;

        // Show/Hide Analyze Button
        const btnContainer = document.getElementById('analysis-controls');
        const btn = document.getElementById('btn-analyze-cookies');
        const progressBar = document.getElementById('analysis-progress');

        cookieData.forEach(c => { if (!c.analysis) pendingCount++; });

        if (pendingCount > 0 && backendStatus === 'online') {
            btnContainer.style.display = 'block';
            if (progressBar.style.display === 'none') {
                btn.style.display = 'block';
                btn.disabled = false;
                btn.innerText = `Analyze ${pendingCount} Cookies`;
            }
        } else if (progressBar.style.display === 'none') {
            btnContainer.style.display = 'none';
        }
    }
});
