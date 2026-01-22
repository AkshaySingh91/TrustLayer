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
    const linksList = document.getElementById('terms-links-list');
    const resultEl = document.getElementById('terms-result');
    const discoveryEl = document.getElementById('terms-discovery');
    const progressEl = document.getElementById('terms-progress');

    // Check if we have a Cached Result first
    const domain = new URL(currentUrl).hostname;
    // We try both types as user might have analyzed either
    // Actually wait, let's just check if we have *something*
    // For now, simple check:

    if (discoveryEl && currentUrl) {
        const domain = new URL(currentUrl).hostname;

        // 1. Check Persistent State
        const persistentState = await chrome.runtime.sendMessage({ action: 'get_domain_status', domain: domain });
        console.log("Popup Init - Domain:", domain, "Persistent State:", persistentState);

        if (persistentState && persistentState.status === 'analyzing') {
            console.log("Restoring analysis state:", persistentState);
            discoveryEl.classList.add('hidden');
            resultEl.classList.add('hidden');

            if (progressEl) {
                progressEl.classList.remove('hidden');
                progressEl.style.display = 'block';
                // Restore progress bar
                const pct = Math.round((persistentState.progress || 0) * 100);
                const txt = document.getElementById('progress-text');
                const fill = document.getElementById('progress-fill');
                if (txt) txt.innerText = `${pct}%`;
                if (fill) fill.style.width = `${pct}%`;
            }
            return;
        } else if (persistentState && persistentState.status === 'error') {
            console.log("Previous analysis failed:", persistentState.details);
            if (progressEl) progressEl.classList.add('hidden');
            if (resultEl) resultEl.classList.add('hidden');
            if (discoveryEl) {
                discoveryEl.classList.remove('hidden');
                discoveryEl.innerHTML = `
                    <div style="text-align:center; padding:20px;">
                        <div style="font-size:24px; margin-bottom:10px;">⚠️</div>
                        <h3 style="margin:0; font-size:16px;">Analysis Failed</h3>
                        <p style="font-size:13px; color:var(--text-secondary); margin:10px 0;">
                            ${persistentState.details || "Unknown error occurred."}
                        </p>
                        <button id="retry-btn" class="primary-btn">Retry</button>
                    </div>
                 `;
                setTimeout(() => {
                    document.getElementById('retry-btn')?.addEventListener('click', () => {
                        window.location.reload();
                    });
                }, 0);
            }
            return;
        }

        if (persistentState && persistentState.status === 'completed') {
            // Should have been caught by 'Check Cache' logic below, but explicitly logging it.
            console.log("Analysis marked as completed. Fetching results...");
        }

        // 2. Check Cache
        try {
            const cachedDocs = await chrome.runtime.sendMessage({ action: 'get_term_analysis', domain: domain });
            if (cachedDocs) {
                renderTermsResult(cachedDocs);
                return;
            }
        } catch (e) { }

        // 3. Initial State: Verify Button
        console.log("Initializing Verify State. Hiding loader.");
        if (progressEl) {
            progressEl.classList.add('hidden');
            progressEl.style.display = 'none'; // Safety
        }
        if (resultEl) resultEl.classList.add('hidden');
        if (discoveryEl) discoveryEl.classList.remove('hidden');

        discoveryEl.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <div style="font-size:24px; margin-bottom:10px;">🛡️</div>
                    <h3 style="margin:0; font-size:16px;">Terms & Conditions</h3>
                    <p style="font-size:13px; color:var(--text-secondary); margin:10px 0;">
                        Verify if this is a legal document before analyzing.
                    </p>
                    <button id="verify-page-btn" class="primary-btn" style="margin-top:8px;">Check Current Page</button>
                    
                     <div id="manual-instruction" class="hidden" style="margin-top:20px; border-top:1px solid var(--border); padding-top:15px;">
                        <h4 style="font-size:14px; margin:0 0 8px 0;">Manual Analysis</h4>
                        <p style="font-size:12px; color:var(--text-secondary);">
                            Select text -> Right Click -> <b>Analyze with TrustLayer</b>
                        </p>
                    </div>
                </div>
            `;

        const verifyBtn = document.getElementById('verify-page-btn');
        verifyBtn.addEventListener('click', async () => {
            verifyBtn.disabled = true;
            verifyBtn.innerText = "Checking...";

            // Local Script Injection for Fast Validation
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs[0]) return;

            const validation = await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                    const kws = ['terms', 'privacy', 'policy', 'agreement', 'conditions', 'legal', 'tos'];
                    const url = window.location.href.toLowerCase();
                    const title = document.title.toLowerCase();

                    // 1. Strong Signal: URL or Title
                    if (kws.some(k => url.includes(k) || title.includes(k))) return { valid: true, reason: 'meta' };

                    // 2. Medium Signal: H1
                    const h1 = document.querySelector('h1')?.innerText.toLowerCase() || '';
                    if (kws.some(k => h1.includes(k))) return { valid: true, reason: 'h1' };

                    // 3. Weak Signal: Body keywords (but exclude footer/nav if possible)
                    // We clone body to strip common noise
                    const clone = document.body.cloneNode(true);
                    ['footer', 'nav', 'script', 'style'].forEach(t => clone.querySelectorAll(t).forEach(e => e.remove()));
                    const text = clone.innerText.toLowerCase().slice(0, 3000); // Top 3k chars only
                    const hasKeywords = kws.some(k => text.includes(k));

                    return { valid: hasKeywords, reason: 'content' };
                }
            });

            const isValid = validation[0]?.result?.valid;

            if (isValid) {
                discoveryEl.innerHTML = `
                        <div style="text-align:center; padding:20px;">
                            <div style="font-size:24px; margin-bottom:10px; color:var(--success);">✅</div>
                            <h3 style="margin:0; font-size:16px;">Legal Page Verified</h3>
                            <p style="font-size:13px; color:var(--text-primary); margin:10px 0; font-weight:500;">
                                Ready to analyze.
                            </p>
                            <div style="background:var(--bg-secondary); padding:10px; border-radius:6px; font-size:12px; color:var(--text-secondary); text-align:left;">
                                <ol style="padding-left:15px; margin:0;">
                                    <li>Select the text you want to check.</li>
                                    <li>Right-click your selection.</li>
                                    <li>Choose <b>"Analyze with TrustLayer"</b>.</li>
                                </ol>
                            </div>
                        </div>
                    `;
            } else {
                discoveryEl.innerHTML = `
                        <div style="text-align:center; padding:20px;">
                            <div style="font-size:24px; margin-bottom:10px;">⚠️</div>
                            <h3 style="margin:0; font-size:16px;">Not a Standard Legal Page</h3>
                            <p style="font-size:13px; color:var(--text-secondary); margin:10px 0;">
                                We couldn't automatically verify this as a Terms or Privacy page.
                            </p>
                            <p style="font-size:12px; color:var(--text-primary);">
                                You can still analyze manually: <br>
                                <b>Select Text -> Right Click -> Analyze</b>
                            </p>
                        </div>
                    `;
            }
        });

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
                console.log("Received terms_progress:", msg);
                // Only show loader if we are on the Terms tab
                const termsTab = document.querySelector('.tab-btn[data-tab="terms"]');
                if (termsTab && termsTab.classList.contains('active')) {
                    if (progressEl) {
                        progressEl.classList.remove('hidden');
                        progressEl.style.display = 'block';
                    }
                    if (discoveryEl) discoveryEl.classList.add('hidden');
                    if (resultEl) resultEl.classList.add('hidden');
                }

                const pct = Math.round((msg.current / msg.total) * 100);
                document.getElementById('progress-text').innerText = `${pct}%`;
                document.getElementById('progress-fill').style.width = `${pct}%`;

                if (pct >= 99 && !window.isFinishingAnalysis) {
                    window.isFinishingAnalysis = true;
                    // Retry logic to ensure data is saved
                    let attempts = 0;
                    const checkResult = async () => {
                        attempts++;
                        const domain = new URL(currentUrl).hostname;
                        try {
                            const cachedDocs = await chrome.runtime.sendMessage({ action: 'get_term_analysis', domain: domain });
                            if (cachedDocs) {
                                renderTermsResult(cachedDocs);
                            } else if (attempts < 3) {
                                setTimeout(checkResult, 1000);
                            } else {
                                console.warn("Analysis complete but result not found after retries.");
                                progressEl.classList.add('hidden');
                                discoveryEl.classList.remove('hidden');
                                fetchAndRender();
                            }
                        } catch (e) { console.error(e); }
                    };
                    setTimeout(checkResult, 1000);
                }
            }
            if (msg.action === 'terms_complete') {
                const domain = new URL(currentUrl).hostname;
                if (msg.domain === domain) {
                    renderTermsResult(msg.result);
                }
            }
            if (msg.action === 'terms_error') {
                const domain = new URL(currentUrl).hostname;
                if (msg.domain === domain) {
                    progressEl.classList.add('hidden');
                    discoveryEl.classList.remove('hidden');
                    alert("Analysis Failed: " + msg.error);
                }
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
            if (!result) return;

            // Strict Visibility Toggle
            if (progressEl) progressEl.classList.add('hidden');
            if (discoveryEl) discoveryEl.classList.add('hidden');
            if (resultEl) resultEl.classList.remove('hidden');

            const score = result.risk_score;
            let riskLevel = 'Low';
            let riskClass = 'low';
            if (score > 30) { riskLevel = 'Medium'; riskClass = 'medium'; }
            if (score > 60) { riskLevel = 'High'; riskClass = 'high'; }


            // Calculate Donut Chart Properties
            // High Risk = Red, Med = Orange, Low = Green
            const chartColor = riskClass === 'high' ? '#ef4444' : (riskClass === 'medium' ? '#f59e0b' : '#10b981');
            const chartDeg = Math.round((score / 100) * 360);

            resultEl.innerHTML = `
            <div class="result-card">
                <div class="result-header">
                    <div class="donut-chart" style="--chart-color: ${chartColor}; --chart-deg: ${chartDeg}deg;">
                        <div class="donut-hole">${score}</div>
                    </div>
                    <div class="risk-label-container">
                        <div class="risk-title">Security Risk</div>
                        <div class="risk-value ${riskClass}">${riskLevel} Risk</div>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <h3 style="margin:0 0 10px 0; font-size:13px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary);">Summary</h3>
                    <ul class="summary-list">
                        ${result.summary.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>

                ${result.flags.length > 0 ? `
                <div style="margin-bottom: 15px;">
                    <h3 style="margin:0 0 10px 0; font-size:13px; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-secondary);">Risk Factors</h3>
                    <div style="font-size:12px; color:var(--warning); padding:10px; background:rgba(245, 158, 11, 0.1); border-radius:8px; line-height:1.5;">
                        ${result.flags.slice(0, 3).join('<br><br>')}
                    </div>
                </div>
                ` : ''}

                <div style="text-align:center; margin-top:15px; border-top:1px solid rgba(255,255,255,0.05); padding-top:15px;">
                     <button id="reanalyze-btn" class="text-btn" style="font-size:11px; opacity:0.7;">↻ Analyze Again</button>
                </div>
            </div>
        `;

            const reBtn = document.getElementById('reanalyze-btn');
            if (reBtn) reBtn.addEventListener('click', () => {
                // Cleanest way to reset everything is to reload the popup
                window.location.reload();
            });
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
                // Set a 5s timeout for fetching to avoid hanging UI
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout fetching cookies")), 5000)
                );

                const cookies = await Promise.race([
                    chrome.runtime.sendMessage({ action: 'getCookies', url: currentUrl }),
                    timeoutPromise
                ]);

                if (!cookies || cookies.length === 0) {
                    listContainer.innerHTML = '<div class="empty">No cookies detected for this site.</div>';
                    totalEl.innerText = "0/0";
                    highRiskEl.innerText = "0";
                    // Even with no cookies, we might have T&C check or it's just raw sync failed.
                    // But we should NOT show 'Loading...' forever.
                    return;
                }

                // We have cookies (synced or cached). Render them regardless of backend status.
                renderCookies(cookies);

                // Calculate Global Score
                if (currentUrl) {
                    const domain = new URL(currentUrl).hostname;
                    calculateAndShowGrade(cookies, domain);
                }

            } catch (e) {
                // Extension context invalidated or communication error
                console.warn("Fetch Cookies Failed:", e);
                listContainer.innerHTML = '<div class="empty">Error loading cookies.</div>';
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
                        // Offline - Show static icon, NO loader
                        statusHtml = '<span title="Analysis Paused (Offline)" style="font-size:16px;">⏸️</span>';
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
    }
});
