/* 🚀 ENHANCED COOKIE GUARD BACKGROUND WITH DETAILED EXPLANATIONS 🚀 */

console.log("✅ Enhanced Cookie Guard with Explanations Service Worker started at", new Date().toLocaleTimeString());

let cookiePredictionMap = null;
let cookieKnowledge = null;

// 🧮 Simplified Risk Calculator for Service Worker
class SimplifiedRiskCalculator {
  calculateAdvancedRisk(cookie) {
    const name = cookie.name.toLowerCase();
    const value = cookie.value || "";
    const domain = cookie.domain.toLowerCase();
    
    let score = 0;
    let factors = {
      authentication: 0,
      tracking: 0,
      persistence: 0,
      security: 0,
      dataExposure: 0
    };

    // Authentication risk (0-40 points)
    if (name.includes('authtoken') || name.includes('auth_token')) {
      factors.authentication = 95;
      score += 38;
    } else if (name.includes('jwt') || name.includes('bearer')) {
      factors.authentication = 90;
      score += 36;
    } else if (name.includes('sessionid') || name.includes('session_id')) {
      factors.authentication = 85;
      score += 34;
    } else if (name.includes('token') || name.includes('auth')) {
      factors.authentication = 80;
      score += 32;
    } else if (name.includes('login') || name.includes('session')) {
      factors.authentication = 70;
      score += 28;
    } else if (name.includes('user')) {
      factors.authentication = 50;
      score += 20;
    }

    // Tracking risk (0-25 points)
    if (name.includes('_fbp') || name.includes('facebook')) {
      factors.tracking = 95;
      score += 24;
    } else if (name.includes('doubleclick') || name.includes('googlesyndication')) {
      factors.tracking = 90;
      score += 23;
    } else if (name.includes('_ga') || name.includes('_gid')) {
      factors.tracking = 75;
      score += 19;
    } else if (name.includes('_utm') || name.includes('analytics')) {
      factors.tracking = 65;
      score += 16;
    } else if (name.includes('track') || name.includes('ad')) {
      factors.tracking = 60;
      score += 15;
    }

    // Third-party multiplier for tracking
    if (cookie.isThirdParty && factors.tracking > 0) {
      score += 5;
      factors.tracking = Math.min(100, factors.tracking + 20);
    }

    // Persistence risk (0-15 points)
    if (cookie.expirationDate) {
      const now = Date.now() / 1000;
      const daysUntilExpiry = (cookie.expirationDate - now) / (24 * 60 * 60);
      
      if (daysUntilExpiry > 365) {
        factors.persistence = 90;
        score += 14;
      } else if (daysUntilExpiry > 90) {
        factors.persistence = 70;
        score += 11;
      } else if (daysUntilExpiry > 30) {
        factors.persistence = 50;
        score += 8;
      } else if (daysUntilExpiry > 7) {
        factors.persistence = 30;
        score += 5;
      } else {
        factors.persistence = 15;
        score += 2;
      }
    } else {
      factors.persistence = 20; // Session cookies
      score += 3;
    }

    // Security risk (0-10 points, lack of security adds points)
    let securityRisk = 100;
    if (cookie.secure) securityRisk -= 40;
    if (cookie.httpOnly) securityRisk -= 30;
    if (cookie.sameSite) securityRisk -= 20;
    
    factors.security = Math.max(0, securityRisk);
    score += (securityRisk / 100) * 10;

    // Data exposure risk (0-10 points)
    if (name.includes('email') || name.includes('profile')) {
      factors.dataExposure = 80;
      score += 8;
    } else if (name.includes('personal') || name.includes('user')) {
      factors.dataExposure = 60;
      score += 6;
    } else if (value.includes('@') || value.length > 50) {
      factors.dataExposure = 40;
      score += 4;
    } else {
      factors.dataExposure = 20;
      score += 2;
    }

    // Determine risk level
    let riskLevel;
    if (score >= 85) riskLevel = "Critical";
    else if (score >= 65) riskLevel = "High";
    else if (score >= 35) riskLevel = "Medium";
    else riskLevel = "Low";

    return {
      totalScore: Math.round(score),
      riskLevel: riskLevel,
      factors: factors,
      breakdown: this.generateBreakdown(factors, score),
      recommendations: this.generateRecommendations(factors, riskLevel)
    };
  }

  generateBreakdown(factors, totalScore) {
    const breakdown = [];
    const weights = { authentication: 40, tracking: 25, persistence: 15, security: 10, dataExposure: 10 };
    
    Object.keys(factors).forEach(factor => {
      const score = factors[factor];
      const weight = weights[factor];
      const contribution = (score * weight / 100);
      
      breakdown.push({
        factor: factor,
        score: score,
        weight: weight,
        contribution: Math.round(contribution),
        description: this.getFactorDescription(factor, score)
      });
    });

    return breakdown.sort((a, b) => b.contribution - a.contribution);
  }

  generateRecommendations(factors, riskLevel) {
    const recommendations = [];

    if (factors.authentication > 70) {
      recommendations.push("🚨 CRITICAL: Contains authentication data - never block");
    }
    if (factors.tracking > 60) {
      recommendations.push("👁️ HIGH PRIVACY IMPACT: Cross-site tracking detected");
    }
    if (factors.persistence > 60) {
      recommendations.push("⏰ LONG-TERM TRACKING: Cookie persists for extended period");
    }
    if (factors.security > 50) {
      recommendations.push("🔓 SECURITY WARNING: Missing important security features");
    }
    if (factors.dataExposure > 50) {
      recommendations.push("📊 DATA EXPOSURE: May contain personal information");
    }

    return recommendations;
  }

  getFactorDescription(factor, score) {
    const descriptions = {
      authentication: score > 70 ? "High authentication risk" : score > 30 ? "Moderate auth risk" : "Low auth risk",
      tracking: score > 70 ? "Extensive tracking" : score > 30 ? "Limited tracking" : "No tracking detected",
      persistence: score > 70 ? "Long-term storage" : score > 30 ? "Medium-term storage" : "Short-term storage",
      security: score > 70 ? "Poor security" : score > 30 ? "Moderate security" : "Good security",
      dataExposure: score > 70 ? "High data exposure" : score > 30 ? "Moderate exposure" : "Low exposure"
    };
    return descriptions[factor] || "Unknown";
  }
}

const riskCalculator = new SimplifiedRiskCalculator();
console.log("✅ Advanced Risk Calculator initialized");

// 🧠 Load both prediction map and enhanced knowledge base
Promise.all([
  fetch(chrome.runtime.getURL("cookie_prediction_map.json")).then(res => res.json()),
  fetch(chrome.runtime.getURL("enhanced_cookie_knowledge.json")).then(res => res.json())
]).then(([predictionData, knowledgeData]) => {
  cookiePredictionMap = predictionData;
  cookieKnowledge = knowledgeData;
  console.log("✅ Loaded prediction map with", Object.keys(predictionData).length, "entries");
  console.log("✅ Loaded enhanced knowledge base with detailed explanations");
}).catch((err) => {
  console.error("❌ Failed to load knowledge bases:", err);
  // Fallback data
  cookiePredictionMap = {
    "_ga": "Analytics",
    "_gid": "Analytics", 
    "_fbp": "Marketing",
    "sessionid": "Session",
    "authToken": "Authentication",
    "csrftoken": "Security"
  };
});

// 🎯 Enhanced AI Cookie Classification with Detailed Explanations
function aiClassifyCookieWithExplanation(name, domain, value, cookieObject = null) {
  try {
    const lowered = name.toLowerCase();
    let classification = null;
    
    // Validate inputs
    if (!name || !domain) {
      console.warn("Missing required parameters for cookie classification:", { name, domain });
      return getDefaultClassification(name || "unknown", domain || "unknown");
    }
    
    // 1. Check exact match in knowledge base
    if (cookieKnowledge?.cookie_explanations?.[name]) {
      const knownCookie = cookieKnowledge.cookie_explanations[name];
      classification = {
        category: knownCookie.category,
        purpose: knownCookie.purpose,
        riskLevel: knownCookie.risk_level,
        explanation: knownCookie.user_friendly_explanation,
        whyUsed: knownCookie.why_used,
        privacyRisk: knownCookie.privacy_risk,
        securityRisk: knownCookie.security_risk,
        dataCollected: knownCookie.data_collected,
        canBeBlocked: knownCookie.can_be_blocked,
        isEssential: knownCookie.essential,
        warning: knownCookie.warning,
        securityAdvice: knownCookie.security_advice,
        securityBenefit: knownCookie.security_benefit,
        detailedAnalysis: true
      };
      
      // Calculate risk score for known cookies using additional properties
      if (cookieObject) {
        try {
          const riskCalculator = new SimplifiedRiskCalculator();
          const riskScore = riskCalculator.calculateOverallRisk(
            cookieObject.name,
            cookieObject.domain,
            cookieObject.value,
            cookieObject
          );
          classification.riskScore = riskScore.score;
          classification.riskBreakdown = riskScore.breakdown;
          classification.riskRecommendations = riskScore.recommendations;
          
          // Override risk level if calculated score is significantly different
          if (riskScore.score >= 85 && classification.riskLevel !== "Critical") {
            classification.riskLevel = "Critical";
          } else if (riskScore.score >= 65 && classification.riskLevel === "Low") {
            classification.riskLevel = "High";
          }
        } catch (error) {
          console.warn("Risk calculation failed for known cookie:", error);
        }
      }
      
      return classification;
    }

    // 2. Check prediction map for basic classification
    if (cookiePredictionMap?.[name]) {
      classification = { 
        category: cookiePredictionMap[name],
        basicClassification: true 
      };
    }

    // 3. Pattern-based classification with enhanced explanations
    if (!classification) {
      classification = classifyByPatternWithExplanation(name, domain, value);
    }

    return enhanceBasicClassification(classification, name, domain, value, cookieObject);
  } catch (error) {
    console.error("Error in aiClassifyCookieWithExplanation:", error, { name, domain });
    return getDefaultClassification(name, domain);
  }
}

// 🔍 Pattern-based classification with detailed explanations
function classifyByPatternWithExplanation(name, domain, value) {
  try {
    const n = name.toLowerCase();
    const d = domain.toLowerCase();
    const patterns = cookieKnowledge?.general_cookie_patterns || {};

    // Check each pattern category
    for (const [patternType, patternData] of Object.entries(patterns)) {
      if (patternData.keywords && patternData.keywords.some(keyword => n.includes(keyword.toLowerCase()))) {
        return {
          category: patternType.charAt(0).toUpperCase() + patternType.slice(1),
          riskLevel: patternData.default_risk,
          explanation: patternData.explanation,
          patternMatched: patternType,
          detailedAnalysis: false
        };
      }
    }

    // Default classification for unknown cookies
    return classifyUnknownCookie(name, domain, value);
  } catch (error) {
    console.error("Error in classifyByPatternWithExplanation:", error, { name, domain });
    return getDefaultClassification(name, domain);
  }
}

// 🔮 Classify unknown cookies with security-focused explanations
function classifyUnknownCookie(name, domain, value) {
  const n = name.toLowerCase();
  const d = domain.toLowerCase();
  const valueStr = value ? value.substring(0, 50) : "";
  
  // High-risk patterns that suggest authentication/session data
  if (n.includes('token') || n.includes('auth') || n.includes('login') || 
      n.includes('session') || n.includes('user') || n.includes('account')) {
    return {
      category: "Authentication/Session",
      riskLevel: "Critical",
      explanation: "This cookie appears to contain authentication or session information that could give access to your account if compromised.",
      whyUsed: "Likely used to keep you logged in or verify your identity on this website",
      securityRisk: "HIGH SECURITY RISK: Could allow account access if stolen by malicious actors",
      privacyRisk: "Contains identifying information linked to your account",
      warning: "🚨 SECURITY ALERT: This cookie may contain sensitive authentication data",
      securityAdvice: "Ensure you're on a secure (HTTPS) website and log out when finished",
      canBeBlocked: false,
      isEssential: true,
      detailedAnalysis: false
    };
  }

  // Tracking/analytics patterns
  if (n.includes('track') || n.includes('analytics') || n.includes('ga') || 
      n.includes('gtag') || n.includes('utm') || n.includes('visitor')) {
    return {
      category: "Analytics/Tracking", 
      riskLevel: "Medium",
      explanation: "This cookie tracks your behavior on this website for analytics or marketing purposes.",
      whyUsed: "Helps website owners understand how visitors use their site or target advertising",
      privacyRisk: "Monitors your browsing patterns and may share data with third parties",
      securityRisk: "Low direct security risk, but privacy implications for data collection",
      warning: "ℹ️ PRIVACY NOTICE: This cookie monitors your website activity",
      canBeBlocked: true,
      isEssential: false,
      detailedAnalysis: false
    };
  }

  // Advertising patterns
  if (n.includes('ad') || n.includes('marketing') || n.includes('campaign') ||
      d.includes('doubleclick') || d.includes('googlesyndication') || d.includes('facebook')) {
    return {
      category: "Advertising/Marketing",
      riskLevel: "High", 
      explanation: "This cookie is used for advertising and marketing purposes, potentially tracking you across multiple websites.",
      whyUsed: "Creates advertising profiles and shows targeted ads based on your browsing behavior",
      privacyRisk: "HIGH PRIVACY IMPACT: Builds detailed profiles for advertising across many websites",
      securityRisk: "Medium - Could reveal personal interests useful for social engineering",
      warning: "⚠️ PRIVACY ALERT: This cookie significantly impacts your privacy through cross-site tracking",
      canBeBlocked: true,
      isEssential: false,
      detailedAnalysis: false
    };
  }

  // Security cookies
  if (n.includes('csrf') || n.includes('xsrf') || n.includes('security') || n.includes('secure')) {
    return {
      category: "Security",
      riskLevel: "Low",
      explanation: "This cookie helps protect your security by preventing certain types of attacks.",
      whyUsed: "Protects against Cross-Site Request Forgery and other security threats",
      securityBenefit: "✅ SECURITY PROTECTION: This cookie helps protect your account from attacks",
      privacyRisk: "None - this is a protective security measure",
      securityRisk: "PROTECTIVE: Blocking this may reduce your security",
      canBeBlocked: false,
      isEssential: true,
      detailedAnalysis: false
    };
  }

  // Default unknown cookie
  return {
    category: "Unknown/Functional",
    riskLevel: "Medium",
    explanation: "This cookie's purpose is not immediately clear. It may be used for website functionality or data collection.",
    whyUsed: "Unknown - could be for website functionality, preferences, or data collection",
    privacyRisk: "Unknown privacy impact - could be collecting data",
    securityRisk: "Uncertain security implications - monitor for suspicious activity",
    warning: "❓ UNKNOWN COOKIE: Purpose unclear - review if website functions properly without it",
    canBeBlocked: true,
    isEssential: false,
    detailedAnalysis: false
  };
}

// 📈 Enhance basic classification with additional analysis
function enhanceBasicClassification(classification, name, domain, value, cookieObject = null) {
  if (classification.detailedAnalysis) {
    return classification; // Already has detailed analysis
  }

  // Add risk level information from knowledge base
  const riskInfo = cookieKnowledge?.risk_categories?.[classification.riskLevel];
  if (riskInfo) {
    classification.riskIcon = riskInfo.icon;
    classification.riskColor = riskInfo.color;
    classification.riskDescription = riskInfo.description;
    classification.userWarning = riskInfo.user_warning;
  }

  // 🧮 Calculate advanced risk score using SimplifiedRiskCalculator
  try {
    const riskCalculator = new SimplifiedRiskCalculator();
    const riskResult = riskCalculator.calculateOverallRisk(name, domain, value, cookieObject);
    
    classification.riskScore = riskResult.score;
    classification.riskFactors = riskResult.breakdown;
    classification.riskBreakdown = riskResult.breakdown;
    classification.riskRecommendations = riskResult.recommendations;
    
    // Override risk level if advanced calculation suggests different level
    if (riskResult.level !== classification.riskLevel) {
      console.log(`Risk level updated from ${classification.riskLevel} to ${riskResult.level} for ${name}`);
      classification.riskLevel = riskResult.level;
    }
  } catch (error) {
    console.error("Error calculating advanced risk:", error);
    classification.riskScore = 50; // Default score
  }

  // Add security analysis based on value pattern
  if (value) {
    classification.valueAnalysis = analyzeValue(value, classification.category);
  }

  // Add domain-specific risks
  classification.domainRisk = analyzeDomainRisk(domain);

  return classification;
}

// 🔍 Analyze cookie value for security patterns
function analyzeValue(value, category) {
  const val = value.substring(0, 100); // Analyze first 100 chars
  
  // JWT token pattern
  if (val.includes('.') && val.length > 100) {
    return {
      pattern: "JWT Token",
      risk: "High - appears to contain authentication token",
      advice: "This looks like an authentication token - critical for security"
    };
  }
  
  // Session ID pattern
  if (/^[a-f0-9]{32,}$/i.test(val)) {
    return {
      pattern: "Session ID", 
      risk: "High - appears to be session identifier",
      advice: "Session identifiers can be used to hijack your login session"
    };
  }

  // Encoded data
  if (val.startsWith('eyJ') || val.includes('%')) {
    return {
      pattern: "Encoded Data",
      risk: "Medium - contains encoded information",
      advice: "Encoded data could contain personal information"
    };
  }

  return {
    pattern: "Simple Value",
    risk: "Low - appears to be simple data",
    advice: "Simple value with minimal apparent risk"
  };
}

// 🌐 Analyze domain-specific risks
function analyzeDomainRisk(domain) {
  const d = domain.toLowerCase();
  
  // Known advertising networks
  const adNetworks = ['doubleclick', 'googlesyndication', 'facebook', 'amazon-adsystem', 'googletagmanager'];
  if (adNetworks.some(network => d.includes(network))) {
    return {
      type: "Advertising Network",
      risk: "High privacy impact - major advertising network",
      explanation: "This domain is known for cross-site tracking and advertising"
    };
  }

  // Analytics providers
  const analyticsProviders = ['google-analytics', 'googleanalytics', 'hotjar', 'mixpanel'];
  if (analyticsProviders.some(provider => d.includes(provider))) {
    return {
      type: "Analytics Provider", 
      risk: "Medium privacy impact - analytics tracking",
      explanation: "This domain provides website analytics and user behavior tracking"
    };
  }

  // CDN/Infrastructure
  if (d.includes('cloudflare') || d.includes('amazonaws') || d.includes('cdn')) {
    return {
      type: "Infrastructure/CDN",
      risk: "Low - infrastructure service",
      explanation: "This appears to be website infrastructure, likely low privacy impact"
    };
  }

  return {
    type: "Website Domain",
    risk: "Variable - depends on cookie purpose", 
    explanation: "First-party domain - privacy impact depends on how the website uses the cookie"
  };
}

// �️ Default classification for error handling
function getDefaultClassification(name, domain) {
  return {
    category: "Unknown/Functional",
    riskLevel: "Medium",
    explanation: `This cookie "${name}" has an unknown purpose. It may be used for website functionality.`,
    whyUsed: "Unknown - could be for website functionality, preferences, or data collection",
    privacyRisk: "Unknown privacy impact - monitor for unusual behavior",
    securityRisk: "Uncertain security implications - exercise caution",
    warning: "❓ UNKNOWN COOKIE: Purpose unclear - review if website functions properly without it",
    canBeBlocked: true,
    isEssential: false,
    detailedAnalysis: false,
    riskIcon: "❓",
    riskColor: "#6b7280"
  };
}

// �🔄 Enhanced message handling with detailed explanations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 Received message:", request.action);

  if (request.action === "ping") {
    sendResponse({ status: "pong", timestamp: Date.now() });
    return true;
  }

  if (request.action === "scanCookies") {
    console.log("🔍 Starting enhanced cookie scan with explanations for:", request.url);
    
    chrome.cookies.getAll({ url: request.url }, (cookies) => {
      console.log(`📊 Found ${cookies.length} cookies to analyze with explanations`);
      
      if (chrome.runtime.lastError) {
        console.error("❌ Error getting cookies:", chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError });
        return;
      }

      const currentHost = new URL(request.url).hostname;
      
      const enhancedClassified = cookies.map((cookie) => {
        try {
          const isThirdParty = !cookie.domain.replace(/^\./, '').includes(currentHost.replace(/^www\./, ''));
          const classification = aiClassifyCookieWithExplanation(cookie.name, cookie.domain, cookie.value, cookie);
          
          return {
            name: cookie.name,
          domain: cookie.domain,
          category: classification.category,
          purpose: classification.purpose || `${classification.category} cookie`,
          riskLevel: classification.riskLevel,
          explanation: classification.explanation,
          whyUsed: classification.whyUsed,
          privacyRisk: classification.privacyRisk,
          securityRisk: classification.securityRisk,
          dataCollected: classification.dataCollected,
          warning: classification.warning,
          securityAdvice: classification.securityAdvice,
          securityBenefit: classification.securityBenefit,
          canBeBlocked: classification.canBeBlocked,
          isEssential: classification.isEssential,
          riskIcon: classification.riskIcon,
          riskColor: classification.riskColor,
          riskDescription: classification.riskDescription,
          userWarning: classification.userWarning,
          valueAnalysis: classification.valueAnalysis,
          domainRisk: classification.domainRisk,
          isThirdParty,
          value: cookie.value?.substring(0, 50) + (cookie.value?.length > 50 ? '...' : ''),
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          expires: cookie.expirationDate ? new Date(cookie.expirationDate * 1000).toLocaleDateString() : 'Session',
          path: cookie.path,
          detailedAnalysis: classification.detailedAnalysis
        };
        } catch (error) {
          console.error("Error classifying cookie:", error, cookie);
          // Return a safe default for problematic cookies
          return {
            name: cookie.name || "unknown",
            domain: cookie.domain || "unknown",
            category: "Unknown",
            riskLevel: "Medium",
            explanation: "Error occurred while analyzing this cookie",
            warning: "⚠️ Analysis Error: Could not determine cookie properties",
            canBeBlocked: true,
            isEssential: false,
            value: "Error",
            secure: false,
            httpOnly: false,
            expires: 'Unknown',
            path: '/',
            detailedAnalysis: false
          };
        }
      });

      // Sort by risk level (Critical -> High -> Medium -> Low)
      const riskOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      enhancedClassified.sort((a, b) => riskOrder[b.riskLevel] - riskOrder[a.riskLevel]);

      console.log("✅ Enhanced classification complete with detailed explanations");

      // Save to storage
      chrome.storage.local.set({ cookieReport: enhancedClassified }, () => {
        if (chrome.runtime.lastError) {
          console.error("❌ Error saving to storage:", chrome.runtime.lastError);
        } else {
          console.log("💾 Enhanced cookie report saved to storage");
        }
      });

      // Send enhanced report to popup
      try {
        chrome.runtime.sendMessage({
          action: "showCookieReport",
          cookies: enhancedClassified,
          stats: {
            total: enhancedClassified.length,
            essential: enhancedClassified.filter(c => c.isEssential).length,
            thirdParty: enhancedClassified.filter(c => c.isThirdParty).length,
            critical: enhancedClassified.filter(c => c.riskLevel === 'Critical').length,
            high: enhancedClassified.filter(c => c.riskLevel === 'High').length,
            medium: enhancedClassified.filter(c => c.riskLevel === 'Medium').length,
            low: enhancedClassified.filter(c => c.riskLevel === 'Low').length
          }
        });
        console.log("📤 Enhanced cookie report with explanations sent to popup");
      } catch (error) {
        console.error("❌ Error sending enhanced message:", error);
      }

      sendResponse({ success: true, count: enhancedClassified.length });
    });
    
    return true; // Indicate async response
  }

  // Handle simplified cookie choices
  if (request.action === "applyCookieChoices") {
    console.log("🍪 Applying cookie choices:", request);
    
    // Block rejected cookies
    if (request.rejectedCookies && request.rejectedCookies.length > 0) {
      request.rejectedCookies.forEach(cookie => {
        chrome.cookies.remove({
          url: request.url || `https://${cookie.domain}`,
          name: cookie.name
        }, (details) => {
          if (chrome.runtime.lastError) {
            console.warn(`Failed to remove cookie ${cookie.name}:`, chrome.runtime.lastError);
          } else {
            console.log(`❌ Rejected cookie: ${cookie.name}`);
          }
        });
      });
    }
    
    sendResponse({ 
      success: true, 
      accepted: request.acceptedCookies?.length || 0,
      rejected: request.rejectedCookies?.length || 0
    });
    return true;
  }

  // Handle cookie selection application
  if (request.action === "applyCookieSelection") {
    console.log("🎯 Applying cookie selection:", request);
    
    // Block unselected cookies
    if (request.blockedCookies && request.blockedCookies.length > 0) {
      request.blockedCookies.forEach(cookie => {
        chrome.cookies.remove({
          url: request.url || `https://${cookie.domain}`,
          name: cookie.name
        }, (details) => {
          if (chrome.runtime.lastError) {
            console.warn(`Failed to remove cookie ${cookie.name}:`, chrome.runtime.lastError);
          } else {
            console.log(`🚫 Blocked cookie: ${cookie.name}`);
          }
        });
      });
    }
    
    sendResponse({ 
      success: true, 
      accepted: request.selectedCookies?.length || 0,
      blocked: request.blockedCookies?.length || 0
    });
    return true;
  }

  // Handle blocking selected cookies
  if (request.action === "blockCookies") {
    console.log("🚫 Blocking selected cookies:", request);
    
    if (request.cookies && request.cookies.length > 0) {
      request.cookies.forEach(cookie => {
        chrome.cookies.remove({
          url: request.url || `https://${cookie.domain}`,
          name: cookie.name
        }, (details) => {
          if (chrome.runtime.lastError) {
            console.warn(`Failed to block cookie ${cookie.name}:`, chrome.runtime.lastError);
          } else {
            console.log(`🚫 Blocked cookie: ${cookie.name}`);
          }
        });
      });
    }
    
    sendResponse({ success: true, blocked: request.cookies?.length || 0 });
    return true;
  }

  // Handle allowing selected cookies (mainly for logging/tracking)
  if (request.action === "allowCookies") {
    console.log("✅ Allowing selected cookies:", request);
    // In a real implementation, you might whitelist these cookies
    // For now, we just log the action
    
    sendResponse({ success: true, allowed: request.cookies?.length || 0 });
    return true;
  }

  return false;
});