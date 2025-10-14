/* Simple Cookie Guard Popup - Reliable and Fast */

console.log("🍪 Cookie Guard Popup Loading...");

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOM Content Loaded");

    try {
        // Get DOM elements
        const scanBtn = document.getElementById("scanBtn");
        const acceptEssential = document.getElementById("acceptEssential");
        const acceptAll = document.getElementById("acceptAll");
        const cookieList = document.getElementById("cookieList");
        const settingsBtn = document.getElementById("settingsBtn");

        // Validate all elements exist
        if (!scanBtn || !acceptEssential || !acceptAll || !cookieList || !settingsBtn) {
            throw new Error("Required DOM elements not found");
        }

        console.log("✅ All DOM elements found");

        // Load existing cookie report
        loadCookieReport();

        // Scan button click handler
        scanBtn.addEventListener("click", () => {
            console.log("🔍 Scan button clicked");
            showLoading();
            
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError) {
                    console.error("Chrome runtime error:", chrome.runtime.lastError);
                    showError("Chrome runtime error occurred");
                    return;
                }

                if (tabs[0]?.url) {
                    console.log("📡 Sending scan message for:", tabs[0].url);
                    chrome.runtime.sendMessage({
                        action: "scanCookies",
                        url: tabs[0].url,
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Message sending error:", chrome.runtime.lastError);
                            showError("Failed to communicate with background script");
                            hideLoading();
                        }
                    });
                } else {
                    console.error("❌ No active tab URL found");
                    showError("No active tab found");
                    hideLoading();
                }
            });
        });

        // Settings button click handler
        settingsBtn.addEventListener("click", () => {
            chrome.runtime.openOptionsPage();
        });

        // Accept essential cookies
        acceptEssential.addEventListener("click", () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "acceptEssential"
                    });
                }
            });
        });

        // Accept all cookies
        acceptAll.addEventListener("click", () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "acceptAll"
                    });
                }
            });
        });

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log("📨 Received message:", message);
            
            if (message.action === "showCookieReport") {
                hideLoading();
                renderCookies(message.cookies);
            } else if (message.type === "TERMS_SUMMARY") {
                showTermsSummary(message.summary);
            }
        });

        console.log("✅ Event listeners attached");

    } catch (error) {
        console.error("❌ Critical error in popup:", error);
        showError("Extension initialization failed: " + error.message);
    }

    // Load existing cookie report from storage
    function loadCookieReport() {
        chrome.storage.local.get("cookieReport", (data) => {
            if (chrome.runtime.lastError) {
                console.error("Storage error:", chrome.runtime.lastError);
                return;
            }
            
            console.log("📦 Loaded storage data:", data);
            if (data.cookieReport && Array.isArray(data.cookieReport)) {
                renderCookies(data.cookieReport);
            }
        });
    }

    // Render cookies in the list
    function renderCookies(cookies) {
        console.log("🎨 Rendering", cookies.length, "cookies");
        
        if (!Array.isArray(cookies)) {
            console.error("Invalid cookies data:", cookies);
            showError("Invalid cookie data received");
            return;
        }

        cookieList.innerHTML = "";

        if (cookies.length === 0) {
            cookieList.innerHTML = "<p>No cookies found on this page</p>";
            return;
        }

        // Add stats
        const stats = calculateStats(cookies);
        const statsHTML = `
            <div class="stats-container">
                <div class="stat-card">
                    <span class="stat-number">${cookies.length}</span>
                    <span class="stat-label">Total</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.essential}</span>
                    <span class="stat-label">Essential</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.tracking}</span>
                    <span class="stat-label">Tracking</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.marketing}</span>
                    <span class="stat-label">Marketing</span>
                </div>
            </div>
        `;
        cookieList.innerHTML += statsHTML;

        // Render each cookie
        cookies.forEach(cookie => {
            const cookieEl = createCookieElement(cookie);
            cookieList.appendChild(cookieEl);
        });
    }

    // Create cookie element
    function createCookieElement(cookie) {
        const div = document.createElement("div");
        div.className = "cookie-item";
        
        const category = cookie.category || "unknown";
        const purpose = cookie.purpose || "Unknown purpose";
        const risk = cookie.risk || "medium";

        div.innerHTML = `
            <div class="cookie-name">${cookie.name}</div>
            <div class="cookie-details">
                <div>Domain: ${cookie.domain}</div>
                <div>Purpose: ${purpose}</div>
                <div>Expires: ${cookie.expirationDate ? new Date(cookie.expirationDate * 1000).toLocaleDateString() : 'Session'}</div>
            </div>
            <span class="cookie-category ${category.toLowerCase()}">${category}</span>
        `;

        return div;
    }

    // Calculate statistics
    function calculateStats(cookies) {
        const stats = {
            essential: 0,
            tracking: 0,
            marketing: 0,
            analytics: 0
        };

        cookies.forEach(cookie => {
            const category = (cookie.category || "").toLowerCase();
            if (category.includes("essential") || category.includes("necessary")) {
                stats.essential++;
            } else if (category.includes("tracking") || category.includes("performance")) {
                stats.tracking++;
            } else if (category.includes("marketing") || category.includes("advertising")) {
                stats.marketing++;
            } else if (category.includes("analytics")) {
                stats.analytics++;
            }
        });

        return stats;
    }

    // Show loading state
    function showLoading() {
        cookieList.innerHTML = '<div class="loading">🔍 Scanning cookies...</div>';
    }

    // Hide loading state
    function hideLoading() {
        // Loading will be replaced by renderCookies
    }

    // Show error message
    function showError(message) {
        cookieList.innerHTML = `<div class="error">❌ ${message}</div>`;
    }

    // Show terms summary
    function showTermsSummary(summary) {
        const termsSection = document.getElementById("terms-section");
        const termsSummary = document.getElementById("terms-summary");
        
        if (termsSection && termsSummary) {
            termsSummary.textContent = summary;
            termsSection.style.display = "block";
        }
    }
});

console.log("🍪 Cookie Guard Popup Script Loaded");