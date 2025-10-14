/* 🧮 ADVANCED RISK CALCULATION ENGINE FOR COOKIE GUARD 🧮 */

// Risk scoring system with quantitative metrics
class CookieRiskCalculator {
  constructor() {
    // Risk factor weights (total should be 100)
    this.weights = {
      authentication: 40,    // Highest weight for auth-related risks
      dataExposure: 25,     // Risk of exposing sensitive data
      trackingScope: 20,    // Cross-site tracking capabilities
      persistence: 10,      // How long the cookie lasts
      security: 5          // Security features (HTTPS, HttpOnly)
    };

    // Risk thresholds for categorical assignment
    this.thresholds = {
      critical: 85,  // 85-100: Critical risk
      high: 65,      // 65-84: High risk  
      medium: 35,    // 35-64: Medium risk
      low: 0         // 0-34: Low risk
    };
  }

  // 🎯 Main risk calculation function
  calculateRisk(cookie) {
    try {
      const scores = {
        authentication: this.calculateAuthenticationRisk(cookie),
        dataExposure: this.calculateDataExposureRisk(cookie),
        trackingScope: this.calculateTrackingRisk(cookie),
        persistence: this.calculatePersistenceRisk(cookie),
        security: this.calculateSecurityRisk(cookie)
      };

      // Calculate weighted total score
      const totalScore = Object.keys(scores).reduce((total, factor) => {
        return total + (scores[factor] * this.weights[factor] / 100);
      }, 0);

      const riskLevel = this.getRiskLevel(totalScore);
      
      return {
        totalScore: Math.round(totalScore),
        riskLevel: riskLevel,
        riskFactors: scores,
        riskBreakdown: this.generateRiskBreakdown(scores, totalScore),
        recommendations: this.generateRecommendations(scores, riskLevel),
        riskDescription: this.getRiskDescription(totalScore, riskLevel)
      };
    } catch (error) {
      console.error("Error calculating risk:", error);
      return this.getDefaultRisk();
    }
  }

  // 🔐 Authentication risk assessment (0-100)
  calculateAuthenticationRisk(cookie) {
    const name = cookie.name.toLowerCase();
    const value = cookie.value || "";
    
    let score = 0;

    // Critical authentication patterns
    if (name.includes('authtoken') || name.includes('auth_token')) score += 95;
    else if (name.includes('access_token') || name.includes('bearer')) score += 90;
    else if (name.includes('jwt') || name.includes('token')) score += 85;
    else if (name.includes('sessionid') || name.includes('session_id')) score += 80;
    else if (name.includes('login') || name.includes('user_id')) score += 75;
    else if (name.includes('auth') || name.includes('session')) score += 70;
    else if (name.includes('user') || name.includes('account')) score += 50;

    // Value pattern analysis
    if (value.length > 0) {
      // JWT token pattern
      if (value.includes('.') && value.length > 100) score += 20;
      // Long random strings (likely tokens)
      else if (value.length > 32 && /^[a-zA-Z0-9+/=]+$/.test(value)) score += 15;
      // Session ID patterns
      else if (/^[a-f0-9]{32,}$/i.test(value)) score += 10;
    }

    return Math.min(100, score);
  }

  // 🔍 Data exposure risk assessment (0-100)
  calculateDataExposureRisk(cookie) {
    const name = cookie.name.toLowerCase();
    const domain = cookie.domain.toLowerCase();
    const value = cookie.value || "";
    
    let score = 0;

    // Personal data indicators
    if (name.includes('email') || name.includes('userid') || name.includes('profile')) score += 80;
    else if (name.includes('personal') || name.includes('identity')) score += 75;
    else if (name.includes('account') || name.includes('user')) score += 60;
    else if (name.includes('preference') || name.includes('setting')) score += 30;

    // Value contains potentially sensitive data
    if (value.includes('@')) score += 40; // Email-like pattern
    if (value.includes('user') || value.includes('profile')) score += 30;
    if (value.length > 50) score += 20; // Large values might contain more data

    // Domain-based exposure risk
    if (domain.includes('facebook') || domain.includes('google')) score += 25;
    if (domain.includes('tracking') || domain.includes('analytics')) score += 20;

    return Math.min(100, score);
  }

  // 🌐 Cross-site tracking risk assessment (0-100)
  calculateTrackingRisk(cookie) {
    const name = cookie.name.toLowerCase();
    const domain = cookie.domain.toLowerCase();
    const isThirdParty = cookie.isThirdParty;
    
    let score = 0;

    // Known tracking cookies
    if (name.includes('_fbp') || name.includes('facebook')) score += 90;
    else if (name.includes('doubleclick') || name.includes('googlesyndication')) score += 85;
    else if (name.includes('_ga') || name.includes('_gid')) score += 70;
    else if (name.includes('_utm') || name.includes('campaign')) score += 65;
    else if (name.includes('track') || name.includes('analytics')) score += 60;
    else if (name.includes('ad') || name.includes('marketing')) score += 55;
    else if (name.includes('visitor') || name.includes('_ref')) score += 40;

    // Third-party tracking multiplier
    if (isThirdParty) score *= 1.3;

    // Known tracking domains
    const trackingDomains = ['doubleclick', 'google-analytics', 'facebook', 'twitter', 'linkedin'];
    if (trackingDomains.some(td => domain.includes(td))) score += 30;

    return Math.min(100, score);
  }

  // ⏰ Persistence risk assessment (0-100)
  calculatePersistenceRisk(cookie) {
    const expirationDate = cookie.expirationDate;
    
    if (!expirationDate) return 20; // Session cookies = lower persistence risk

    const now = Date.now() / 1000;
    const timeUntilExpiry = expirationDate - now;
    const daysUntilExpiry = timeUntilExpiry / (24 * 60 * 60);

    if (daysUntilExpiry > 365) return 90;      // More than 1 year
    else if (daysUntilExpiry > 90) return 70;  // More than 3 months
    else if (daysUntilExpiry > 30) return 50;  // More than 1 month
    else if (daysUntilExpiry > 7) return 30;   // More than 1 week
    else if (daysUntilExpiry > 1) return 15;   // More than 1 day
    else return 5;                             // Less than 1 day
  }

  // 🔒 Security features assessment (0-100, lower score = higher risk)
  calculateSecurityRisk(cookie) {
    let score = 100; // Start with maximum risk

    // Reduce risk for security features
    if (cookie.secure) score -= 40;        // HTTPS only
    if (cookie.httpOnly) score -= 30;      // No JavaScript access
    if (cookie.sameSite) score -= 20;      // SameSite protection
    if (cookie.path === '/') score += 10;  // Broad path = slightly more risk

    return Math.max(0, score);
  }

  // 📊 Determine risk level from total score
  getRiskLevel(score) {
    if (score >= this.thresholds.critical) return "Critical";
    else if (score >= this.thresholds.high) return "High";
    else if (score >= this.thresholds.medium) return "Medium";
    else return "Low";
  }

  // 📋 Generate detailed risk breakdown
  generateRiskBreakdown(scores, totalScore) {
    const breakdown = [];
    
    Object.keys(scores).forEach(factor => {
      const score = scores[factor];
      const weight = this.weights[factor];
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

  // 💡 Generate specific recommendations based on risk factors
  generateRecommendations(scores, riskLevel) {
    const recommendations = [];

    if (scores.authentication > 70) {
      recommendations.push({
        type: "security",
        priority: "critical",
        message: "🚨 This cookie contains authentication data. Always log out on shared devices and ensure you're on HTTPS.",
        action: "Never block - essential for login"
      });
    }

    if (scores.trackingScope > 60) {
      recommendations.push({
        type: "privacy", 
        priority: "high",
        message: "👁️ This cookie tracks your behavior across websites for advertising.",
        action: "Consider blocking for better privacy"
      });
    }

    if (scores.dataExposure > 50) {
      recommendations.push({
        type: "privacy",
        priority: "medium", 
        message: "📊 This cookie may contain or expose personal information.",
        action: "Review website's privacy policy"
      });
    }

    if (scores.persistence > 60) {
      recommendations.push({
        type: "privacy",
        priority: "medium",
        message: "⏰ This cookie persists for a long time, enabling extended tracking.",
        action: "Clear cookies regularly"
      });
    }

    if (scores.security > 50) {
      recommendations.push({
        type: "security",
        priority: "medium",
        message: "🔓 This cookie lacks important security features.",
        action: "Ensure you're on a secure (HTTPS) website"
      });
    }

    return recommendations;
  }

  // 📝 Get detailed risk description
  getRiskDescription(score, riskLevel) {
    const descriptions = {
      Critical: `CRITICAL RISK (Score: ${score}/100): This cookie poses severe security risks. It likely contains authentication data that could give attackers direct access to your accounts if compromised. Never block these cookies as they're essential for login functionality.`,
      
      High: `HIGH RISK (Score: ${score}/100): This cookie significantly impacts your privacy and/or security. It may track your behavior across multiple websites or contain sensitive personal information. Consider blocking unless necessary for website functionality.`,
      
      Medium: `MEDIUM RISK (Score: ${score}/100): This cookie has moderate privacy implications. It may collect behavioral data or personal preferences but is unlikely to compromise account security. Generally safe but worth monitoring.`,
      
      Low: `LOW RISK (Score: ${score}/100): This cookie has minimal privacy or security impact. It's likely used for basic website functionality or contains non-sensitive data. Generally safe to allow.`
    };

    return descriptions[riskLevel] || descriptions.Medium;
  }

  // 📖 Get factor-specific descriptions
  getFactorDescription(factor, score) {
    const descriptions = {
      authentication: score > 70 ? "Contains authentication/session data" : score > 30 ? "May contain user identification" : "No apparent authentication data",
      dataExposure: score > 70 ? "High risk of exposing personal data" : score > 30 ? "May contain personal information" : "Minimal personal data exposure",
      trackingScope: score > 70 ? "Extensive cross-site tracking capabilities" : score > 30 ? "Limited tracking functionality" : "No significant tracking detected",
      persistence: score > 70 ? "Long-term persistent cookie" : score > 30 ? "Medium-term storage" : "Short-term or session cookie",
      security: score > 70 ? "Lacks important security features" : score > 30 ? "Some security features missing" : "Good security features implemented"
    };

    return descriptions[factor] || "Unknown";
  }

  // 🛡️ Default risk for error scenarios
  getDefaultRisk() {
    return {
      totalScore: 50,
      riskLevel: "Medium",
      riskFactors: {
        authentication: 0,
        dataExposure: 50,
        trackingScope: 0,
        persistence: 0,
        security: 50
      },
      riskBreakdown: [],
      recommendations: [{
        type: "info",
        priority: "low",
        message: "⚠️ Could not fully analyze this cookie's risk",
        action: "Exercise caution until purpose is determined"
      }],
      riskDescription: "MEDIUM RISK (Score: 50/100): Unable to fully analyze this cookie. Exercise caution and monitor for unexpected behavior."
    };
  }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CookieRiskCalculator;
} else if (typeof window !== 'undefined') {
  window.CookieRiskCalculator = CookieRiskCalculator;
}