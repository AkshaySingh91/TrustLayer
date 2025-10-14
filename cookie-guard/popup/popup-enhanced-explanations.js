/* Enhanced Cookie Guard Popup - Security & Privacy Educational Interface */

console.log("🍪🛡️ Enhanced Cookie Guard with Explanations Loading...");

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOM Content Loaded - Enhanced Security Mode");

    try {
        // Get DOM elements
        const scanBtn = document.getElementById("scanBtn");
        const acceptEssential = document.getElementById("acceptEssential");
        const acceptAll = document.getElementById("acceptAll");
        const cookieList = document.getElementById("cookieList");
        const settingsBtn = document.getElementById("settingsBtn");
        const riskSummary = document.getElementById("riskSummary");

        // Risk count elements
        const criticalCount = document.getElementById("criticalCount");
        const highCount = document.getElementById("highCount");
        const mediumCount = document.getElementById("mediumCount");
        const lowCount = document.getElementById("lowCount");

        // Validate all elements exist
        if (!scanBtn || !acceptEssential || !acceptAll || !cookieList || !settingsBtn) {
            throw new Error("Required DOM elements not found");
        }

        console.log("✅ All DOM elements found - Enhanced Mode");

        // Load existing cookie report
        loadCookieReport();

        // Scan button click handler
        scanBtn.addEventListener("click", () => {
            console.log("🔍 Enhanced Security Scan Started");
            showLoadingWithSecurity();
            
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError) {
                    console.error("Chrome runtime error:", chrome.runtime.lastError);
                    showError("Chrome runtime error occurred");
                    return;
                }

                if (tabs[0]?.url) {
                    console.log("📡 Scanning for security risks:", tabs[0].url);
                    chrome.runtime.sendMessage({
                        action: "scanCookies",
                        url: tabs[0].url,
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Message sending error:", chrome.runtime.lastError);
                            showError("Failed to communicate with security scanner");
                            hideLoading();
                        }
                    });
                } else {
                    console.error("❌ No active tab URL found");
                    showError("No active tab found for security analysis");
                    hideLoading();
                }
            });
        });

        // Settings button click handler
        settingsBtn.addEventListener("click", () => {
            chrome.runtime.openOptionsPage();
        });

        // Accept essential cookies with warning
        acceptEssential.addEventListener("click", () => {
            if (confirm("This will block non-essential cookies that may impact website functionality. Continue?")) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: "acceptEssential"
                        });
                    }
                });
            }
        });

        // Accept all cookies with warning
        acceptAll.addEventListener("click", () => {
            if (confirm("⚠️ WARNING: This will accept ALL cookies including high-risk tracking and advertising cookies. This may impact your privacy. Are you sure?")) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: "acceptAll"
                        });
                    }
                });
            }
        });

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log("📨 Received enhanced message:", message);
            
            if (message.action === "showCookieReport") {
                hideLoading();
                renderEnhancedCookiesWithExplanations(message.cookies);
                updateRiskSummary(message.stats);
            }
        });

        // Cookie Management Event Listeners
        setupCookieManagement();

        console.log("✅ Enhanced event listeners attached");

    } catch (error) {
        console.error("❌ Critical error in enhanced popup:", error);
        showError("Enhanced security extension initialization failed: " + error.message);
    }

    // Load existing cookie report from storage
    function loadCookieReport() {
        chrome.storage.local.get("cookieReport", (data) => {
            if (chrome.runtime.lastError) {
                console.error("Storage error:", chrome.runtime.lastError);
                return;
            }
            
            console.log("📦 Loaded enhanced storage data:", data);
            if (data.cookieReport && Array.isArray(data.cookieReport)) {
                renderEnhancedCookiesWithExplanations(data.cookieReport);
                updateRiskSummaryFromCookies(data.cookieReport);
            }
        });
    }

    // Render cookies with detailed security explanations
    function renderEnhancedCookiesWithExplanations(cookies) {
        console.log("🎨 Rendering", cookies.length, "cookies with security explanations");
        
        if (!Array.isArray(cookies)) {
            console.error("Invalid cookies data:", cookies);
            showError("Invalid cookie data received");
            return;
        }

        cookieList.innerHTML = "";

        if (cookies.length === 0) {
            cookieList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <h3>🍪 No Cookies Found</h3>
                    <p>This page doesn't appear to set any cookies, or they may be loaded dynamically.</p>
                </div>
            `;
            return;
        }

        // Show risk summary and cookie management
        riskSummary.style.display = "block";
        const cookieManagement = document.getElementById("cookieManagement");
        if (cookieManagement) {
            cookieManagement.style.display = "block";
        }

        // Render each cookie with enhanced explanations
        cookies.forEach((cookie, index) => {
            const cookieEl = createEnhancedCookieElement(cookie, index);
            cookieList.appendChild(cookieEl);
        });

        // Add event listeners to choice buttons
        addChoiceEventListeners();
    }

    // Create enhanced cookie element with detailed explanations
    function createEnhancedCookieElement(cookie, index) {
        const div = document.createElement("div");
        div.className = `cookie-item ${cookie.riskLevel.toLowerCase()}`;
        
        const riskIcon = getRiskIcon(cookie.riskLevel);
        const isExpanded = false; // Default to collapsed for cleaner UI

        div.innerHTML = `
            <div class="cookie-header">
                <div class="cookie-name-section">
                    <div class="cookie-name">${cookie.name}</div>
                    ${cookie.riskScore !== undefined ? `
                        <div class="risk-score-display">
                            <div class="risk-score-bar">
                                <div class="risk-score-fill risk-score-${getRiskScoreClass(cookie.riskScore)}" 
                                     style="width: ${cookie.riskScore}%"></div>
                            </div>
                            <span class="risk-score-text">${cookie.riskScore}/100</span>
                        </div>
                    ` : ''}
                </div>
                <div class="cookie-choice">
                    <div class="choice-buttons">
                        <button class="accept-btn ${cookie.isEssential ? 'active' : ''}" 
                                data-cookie-name="${cookie.name}" 
                                data-cookie-domain="${cookie.domain}"
                                data-choice="accept">
                            ✅ Accept
                        </button>
                        <button class="reject-btn ${!cookie.isEssential ? '' : 'disabled'}" 
                                data-cookie-name="${cookie.name}" 
                                data-cookie-domain="${cookie.domain}"
                                data-choice="reject"
                                ${cookie.isEssential ? 'disabled title="Essential for website functionality"' : ''}>
                            ❌ Reject
                        </button>
                    </div>
                    <div class="risk-badge ${cookie.riskLevel.toLowerCase()}">
                        ${riskIcon} ${cookie.riskLevel}
                    </div>
                </div>
            </div>

            ${cookie.explanation ? `
                <div class="cookie-explanation">
                    <strong>What this cookie does:</strong> ${cookie.explanation}
                </div>
            ` : ''}

            ${cookie.warning ? `
                <div class="warning-box">
                    <strong>⚠️ PRIVACY ALERT:</strong> ${cookie.warning}
                </div>
            ` : ''}

            ${cookie.securityBenefit ? `
                <div class="security-benefit">
                    <strong>✅ SECURITY BENEFIT:</strong> ${cookie.securityBenefit}
                </div>
            ` : ''}

            <div class="cookie-details">
                <div class="cookie-detail-row">
                    <span class="detail-label">Domain:</span>
                    <span class="detail-value">${cookie.domain}</span>
                </div>
                <div class="cookie-detail-row">
                    <span class="detail-label">Category:</span>
                    <span class="detail-value">${cookie.category}</span>
                </div>
                ${cookie.riskScore !== undefined ? `
                <div class="cookie-detail-row">
                    <span class="detail-label">Risk Score:</span>
                    <span class="detail-value risk-score-${getRiskScoreClass(cookie.riskScore)}">${cookie.riskScore}/100</span>
                </div>
                ` : ''}
                <div class="cookie-detail-row">
                    <span class="detail-label">Essential:</span>
                    <span class="detail-value">${cookie.isEssential ? '✅ Yes' : '❌ No'}</span>
                </div>
                <div class="cookie-detail-row">
                    <span class="detail-label">Can Block:</span>
                    <span class="detail-value">${cookie.canBeBlocked ? '✅ Yes' : '🚫 Not recommended'}</span>
                </div>
                <div class="cookie-detail-row">
                    <span class="detail-label">Expires:</span>
                    <span class="detail-value">${cookie.expires}</span>
                </div>
            </div>

            <div class="detailed-info" id="details-${index}" style="display: none;">
                ${cookie.whyUsed ? `
                    <div style="margin-top: 10px;">
                        <strong>Why websites use this:</strong>
                        <div style="margin-top: 5px; font-size: 12px; color: #555;">${cookie.whyUsed}</div>
                    </div>
                ` : ''}

                ${cookie.securityRisk ? `
                    <div style="margin-top: 10px;">
                        <strong>Security Impact:</strong>
                        <div style="margin-top: 5px; font-size: 12px; color: #555;">${cookie.securityRisk}</div>
                    </div>
                ` : ''}

                ${cookie.privacyRisk ? `
                    <div style="margin-top: 10px;">
                        <strong>Privacy Impact:</strong>
                        <div style="margin-top: 5px; font-size: 12px; color: #555;">${cookie.privacyRisk}</div>
                    </div>
                ` : ''}

                ${cookie.dataCollected && cookie.dataCollected.length > 0 ? `
                    <div class="data-collected">
                        <h5>Data this cookie may collect:</h5>
                        <div class="data-tags">
                            ${cookie.dataCollected.map(data => `<span class="data-tag">${data}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                ${cookie.securityAdvice ? `
                    <div class="security-advice">
                        <strong>🔒 Security Advice:</strong> ${cookie.securityAdvice}
                    </div>
                ` : ''}

                ${cookie.valueAnalysis ? `
                    <div style="margin-top: 10px;">
                        <strong>Value Analysis:</strong>
                        <div style="margin-top: 5px; font-size: 12px; color: #555;">
                            Pattern: ${cookie.valueAnalysis.pattern}<br>
                            Risk: ${cookie.valueAnalysis.risk}<br>
                            Advice: ${cookie.valueAnalysis.advice}
                        </div>
                    </div>
                ` : ''}

                ${cookie.riskBreakdown ? `
                    <div class="risk-breakdown-section">
                        <div class="breakdown-header">
                            <strong>🎯 Detailed Risk Analysis</strong>
                            <span class="total-score">Total: ${cookie.riskScore || 'N/A'}/100</span>
                        </div>
                        <div class="risk-factors">
                            ${Object.entries(cookie.riskBreakdown).map(([factor, score]) => {
                                const factorInfo = getRiskFactorInfo(factor);
                                return `<div class="risk-factor-item">
                                    <div class="factor-header">
                                        <span class="factor-icon">${factorInfo.icon}</span>
                                        <span class="factor-name">${factorInfo.name}</span>
                                        <span class="factor-weight">(${factorInfo.weight})</span>
                                    </div>
                                    <div class="factor-score">
                                        <div class="score-bar">
                                            <div class="score-fill score-${getRiskScoreClass(score)}" style="width: ${score}%"></div>
                                        </div>
                                        <span class="score-value score-${getRiskScoreClass(score)}">${score}/100</span>
                                    </div>
                                    <div class="factor-description">${factorInfo.description}</div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                ${cookie.riskRecommendations && cookie.riskRecommendations.length > 0 ? `
                    <div style="margin-top: 10px;">
                        <strong>📋 Risk Recommendations:</strong>
                        <div style="margin-top: 5px; font-size: 12px;">
                            ${cookie.riskRecommendations.map(rec => 
                                `<div class="recommendation">• ${rec}</div>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}

                ${cookie.domainRisk ? `
                    <div style="margin-top: 10px;">
                        <strong>Domain Analysis:</strong>
                        <div style="margin-top: 5px; font-size: 12px; color: #555;">
                            Type: ${cookie.domainRisk.type}<br>
                            Risk: ${cookie.domainRisk.risk}<br>
                            ${cookie.domainRisk.explanation}
                        </div>
                    </div>
                ` : ''}
            </div>

            <button class="expand-btn" data-index="${index}">
                <span id="toggle-text-${index}">📖 Learn More</span>
            </button>
        `;

        // Add event listener for expand button
        const expandBtn = div.querySelector('.expand-btn');
        expandBtn.addEventListener('click', () => toggleDetails(index));

        return div;
    }

    // Toggle function for expanding/collapsing details
    function toggleDetails(index) {
        const details = document.getElementById(`details-${index}`);
        const toggleText = document.getElementById(`toggle-text-${index}`);
        
        if (!details || !toggleText) {
            console.error(`Could not find elements for index ${index}`);
            return;
        }
        
        if (details.style.display === "none" || details.style.display === "") {
            details.style.display = "block";
            toggleText.textContent = "📚 Show Less";
        } else {
            details.style.display = "none";
            toggleText.textContent = "📖 Learn More";
        }
    }

    // Add toggle function to global scope
    window.toggleDetails = toggleDetails;

    // Get risk icon
    function getRiskIcon(riskLevel) {
        const icons = {
            'Critical': '🚨',
            'High': '⚠️',
            'Medium': 'ℹ️',
            'Low': '✅'
        };
        return icons[riskLevel] || 'ℹ️';
    }

    // Update risk summary
    function updateRiskSummary(stats) {
        if (stats) {
            criticalCount.textContent = stats.critical || 0;
            highCount.textContent = stats.high || 0;
            mediumCount.textContent = stats.medium || 0;
            lowCount.textContent = stats.low || 0;
        }
    }

    // Update risk summary from cookies array
    function updateRiskSummaryFromCookies(cookies) {
        const stats = {
            critical: cookies.filter(c => c.riskLevel === 'Critical').length,
            high: cookies.filter(c => c.riskLevel === 'High').length,
            medium: cookies.filter(c => c.riskLevel === 'Medium').length,
            low: cookies.filter(c => c.riskLevel === 'Low').length
        };
        updateRiskSummary(stats);
        riskSummary.style.display = "block";
    }

    // Show loading with security focus
    function showLoadingWithSecurity() {
        cookieList.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <h3>🔍 Security Analysis in Progress</h3>
                <p>Scanning cookies for privacy and security risks...</p>
                <div style="margin-top: 15px; font-size: 12px; color: #666;">
                    • Checking for authentication tokens<br>
                    • Analyzing tracking cookies<br>
                    • Evaluating privacy impact<br>
                    • Assessing security risks
                </div>
            </div>
        `;
        riskSummary.style.display = "none";
    }

    // Hide loading state
    function hideLoading() {
        // Loading will be replaced by renderEnhancedCookiesWithExplanations
    }

    // Show error message
    function showError(message) {
        cookieList.innerHTML = `
            <div class="error">
                <h3>❌ Analysis Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 Retry
                </button>
            </div>
        `;
        riskSummary.style.display = "none";
    }

    // Simplified Cookie Management Functions
    function setupCookieManagement() {
        const applyChoices = document.getElementById("applyChoices");

        if (!applyChoices) {
            console.warn("Apply choices button not found");
            return;
        }

        // Apply choices handler
        applyChoices.addEventListener("click", handleApplyChoices);
    }

    function handleApplyChoices() {
        const acceptedCookies = getAcceptedCookies();
        const rejectedCookies = getRejectedCookies();

        if (acceptedCookies.length === 0 && rejectedCookies.length === 0) {
            alert("⚠️ Please make your choices by clicking Accept or Reject on the cookies above.");
            return;
        }

        const message = `🍪 Your cookie choices:\n\n✅ Accept: ${acceptedCookies.length} cookies\n❌ Reject: ${rejectedCookies.length} cookies\n\nApply these choices?`;
        
        if (confirm(message)) {
            // Apply the choices
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "applyCookieChoices",
                        acceptedCookies: acceptedCookies,
                        rejectedCookies: rejectedCookies
                    });
                    
                    // Show success message
                    alert(`✅ Choices applied!\n\n${acceptedCookies.length} cookies accepted\n${rejectedCookies.length} cookies rejected`);
                }
            });
        }
    }

    function getAcceptedCookies() {
        const acceptButtons = document.querySelectorAll(".accept-btn.active");
        return Array.from(acceptButtons).map(btn => ({
            name: btn.dataset.cookieName,
            domain: btn.dataset.cookieDomain
        }));
    }

    function getRejectedCookies() {
        const rejectButtons = document.querySelectorAll(".reject-btn.active");
        return Array.from(rejectButtons).map(btn => ({
            name: btn.dataset.cookieName,
            domain: btn.dataset.cookieDomain
        }));
    }

    function addChoiceEventListeners() {
        const choiceButtons = document.querySelectorAll(".accept-btn, .reject-btn");
        choiceButtons.forEach(button => {
            if (!button.disabled) {
                button.addEventListener("click", handleChoiceClick);
            }
        });
    }

    function handleChoiceClick(event) {
        const button = event.target;
        const cookieName = button.dataset.cookieName;
        const choice = button.dataset.choice;
        
        // Find the cookie container
        const cookieContainer = button.closest(".cookie-item");
        const acceptBtn = cookieContainer.querySelector(".accept-btn");
        const rejectBtn = cookieContainer.querySelector(".reject-btn");
        
        // Toggle the choice
        if (choice === "accept") {
            acceptBtn.classList.add("active");
            rejectBtn.classList.remove("active");
        } else if (choice === "reject" && !rejectBtn.disabled) {
            rejectBtn.classList.add("active");
            acceptBtn.classList.remove("active");
        }
    }

    // Helper function to get risk factor information
    function getRiskFactorInfo(factor) {
        const factorMap = {
            'authenticationRisk': {
                name: 'Authentication Risk',
                icon: '🔐',
                weight: '40%',
                description: 'Risk of session hijacking or credential theft'
            },
            'trackingRisk': {
                name: 'Tracking Risk',
                icon: '👁️',
                weight: '25%',
                description: 'Cross-site tracking and privacy invasion'
            },
            'persistenceRisk': {
                name: 'Persistence Risk',
                icon: '⏱️',
                weight: '15%',
                description: 'Long-term data storage and profiling risk'
            },
            'securityRisk': {
                name: 'Security Risk',
                icon: '🔒',
                weight: '10%',
                description: 'Missing security flags and protections'
            },
            'dataExposureRisk': {
                name: 'Data Exposure Risk',
                icon: '📊',
                weight: '10%',
                description: 'Sensitive data in cookie value'
            }
        };
        return factorMap[factor] || {
            name: formatRiskFactor(factor),
            icon: '⚠️',
            weight: '',
            description: 'Risk factor analysis'
        };
    }

    // Helper function to get risk score CSS class
    function getRiskScoreClass(score) {
        if (score >= 85) return 'critical';
        if (score >= 65) return 'high';
        if (score >= 35) return 'medium';
        return 'low';
    }

    // Helper function to format risk factor names
    function formatRiskFactor(factor) {
        const factorNames = {
            'authenticationRisk': 'Authentication Risk',
            'trackingRisk': 'Tracking Risk',
            'persistenceRisk': 'Persistence Risk',
            'securityRisk': 'Security Risk',
            'dataExposureRisk': 'Data Exposure Risk'
        };
        return factorNames[factor] || factor.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    // Add event listeners for risk methodology modal
    const riskMethodologyBtn = document.getElementById("riskMethodologyBtn");
    const riskMethodology = document.getElementById("riskMethodology");
    const closeMethodology = document.getElementById("closeMethodology");

    if (riskMethodologyBtn && riskMethodology && closeMethodology) {
        riskMethodologyBtn.addEventListener("click", () => {
            riskMethodology.style.display = "block";
        });

        closeMethodology.addEventListener("click", () => {
            riskMethodology.style.display = "none";
        });

        // Close modal when clicking outside
        riskMethodology.addEventListener("click", (e) => {
            if (e.target === riskMethodology) {
                riskMethodology.style.display = "none";
            }
        });
    }
});

console.log("🍪🛡️ Enhanced Cookie Guard Security Popup Script Loaded");