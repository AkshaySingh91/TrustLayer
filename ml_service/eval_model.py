"""
TrustLayer ML Model Evaluation Script
=====================================
Tests the cookie classification model with a comprehensive dataset
and reports accuracy metrics.

Usage:
    cd ml_service
    python eval_model.py
"""

import requests
import json
from dataclasses import dataclass
from typing import Optional
import time

API_URL = "http://localhost:8000/analyze"
TERMS_API_URL = "http://localhost:8000/analyze_terms"

# ============================================
# TEST DATASET - COOKIES
# ============================================
# Each entry has: name, domain, session, expected_intent, expected_category, expected_max_risk

COOKIE_TEST_CASES = [
    # ========== AUTHENTICATION COOKIES (Should be low risk, Essential) ==========
    {"name": "sessionid", "domain": "bank.com", "session": True, "expected_intent": "Authentication", "expected_category": "Essential", "max_risk": 30},
    {"name": "auth_token", "domain": "stripe.com", "session": False, "expected_intent": "Authentication", "expected_category": "Essential", "max_risk": 30},
    {"name": "JSESSIONID", "domain": "enterprise.com", "session": True, "expected_intent": "Authentication", "expected_category": "Essential", "max_risk": 30},
    {"name": "connect.sid", "domain": "nodejs-app.com", "session": True, "expected_intent": "Authentication", "expected_category": "Essential", "max_risk": 30},
    {"name": "__Secure-next-auth.session-token", "domain": "nextjs-site.com", "session": True, "expected_intent": "Authentication", "expected_category": "Essential", "max_risk": 30},
    {"name": "access_token", "domain": "api.github.com", "session": False, "expected_intent": "Authentication", "expected_category": "Essential", "max_risk": 30},
    {"name": "user_session", "domain": "myapp.io", "session": True, "expected_intent": "Authentication", "expected_category": "Essential", "max_risk": 30},
    {"name": "login_token", "domain": "secure-login.com", "session": False, "expected_intent": "Authentication", "expected_category": "Essential", "max_risk": 30},
    {"name": "remember_me", "domain": "social-network.com", "session": False, "expected_intent": "Authentication", "expected_category": "Essential", "max_risk": 40},
    {"name": "JWT", "domain": "api-service.io", "session": False, "expected_intent": "Authentication", "expected_category": "Essential", "max_risk": 30},
    
    # ========== SECURITY COOKIES (Should be low risk, Essential) ==========
    {"name": "csrf_token", "domain": "any-site.com", "session": True, "expected_intent": "Security", "expected_category": "Essential", "max_risk": 30},
    {"name": "XSRF-TOKEN", "domain": "angular-app.com", "session": True, "expected_intent": "Security", "expected_category": "Essential", "max_risk": 30},
    {"name": "_csrf", "domain": "rails-app.com", "session": True, "expected_intent": "Security", "expected_category": "Essential", "max_risk": 30},
    {"name": "__cf_bm", "domain": "cloudflare.com", "session": True, "expected_intent": "Security", "expected_category": "Essential", "max_risk": 30},
    {"name": "cf_clearance", "domain": "protected-site.com", "session": False, "expected_intent": "Security", "expected_category": "Essential", "max_risk": 30},
    {"name": "wp_sec_", "domain": "wordpress.com", "session": True, "expected_intent": "Security", "expected_category": "Essential", "max_risk": 30},
    {"name": "AWSALB", "domain": "aws-hosted.com", "session": True, "expected_intent": "Security", "expected_category": "Essential", "max_risk": 35},
    {"name": "incap_ses_", "domain": "imperva-protected.com", "session": True, "expected_intent": "Security", "expected_category": "Essential", "max_risk": 30},
    {"name": "__ddg1_", "domain": "ddg-protected.com", "session": True, "expected_intent": "Security", "expected_category": "Essential", "max_risk": 30},
    {"name": "recaptcha_token", "domain": "google.com", "session": True, "expected_intent": "Security", "expected_category": "Essential", "max_risk": 30},
    
    # ========== PREFERENCE COOKIES (Functional, Medium Risk) ==========
    {"name": "language", "domain": "international-site.com", "session": False, "expected_intent": "Preference", "expected_category": "Functional", "max_risk": 40},
    {"name": "theme", "domain": "app.com", "session": False, "expected_intent": "Preference", "expected_category": "Functional", "max_risk": 35},
    {"name": "locale", "domain": "multi-lang.com", "session": False, "expected_intent": "Preference", "expected_category": "Functional", "max_risk": 35},
    {"name": "dark_mode", "domain": "modern-app.com", "session": False, "expected_intent": "Preference", "expected_category": "Functional", "max_risk": 30},
    {"name": "cookie_consent", "domain": "gdpr-compliant.eu", "session": False, "expected_intent": "Preference", "expected_category": "Functional", "max_risk": 25},
    {"name": "region", "domain": "geo-site.com", "session": False, "expected_intent": "Preference", "expected_category": "Functional", "max_risk": 40},
    {"name": "timezone", "domain": "scheduling.com", "session": False, "expected_intent": "Preference", "expected_category": "Functional", "max_risk": 30},
    {"name": "font_size", "domain": "accessible.com", "session": False, "expected_intent": "Preference", "expected_category": "Functional", "max_risk": 25},
    {"name": "volume", "domain": "media-player.com", "session": False, "expected_intent": "Preference", "expected_category": "Functional", "max_risk": 25},
    {"name": "sidebar_collapsed", "domain": "dashboard.io", "session": False, "expected_intent": "Preference", "expected_category": "Functional", "max_risk": 20},
    
    # ========== ANALYTICS COOKIES (Medium-High Risk) ==========
    {"name": "_ga", "domain": "google-analytics.com", "session": False, "expected_intent": "Analytics", "expected_category": "Analytics", "min_risk": 40},
    {"name": "_gid", "domain": "google-analytics.com", "session": False, "expected_intent": "Analytics", "expected_category": "Analytics", "min_risk": 40},
    {"name": "_gat", "domain": "google-analytics.com", "session": True, "expected_intent": "Analytics", "expected_category": "Analytics", "min_risk": 35},
    {"name": "mp_", "domain": "mixpanel.com", "session": False, "expected_intent": "Analytics", "expected_category": "Analytics", "min_risk": 40},
    {"name": "amplitude_id", "domain": "amplitude.com", "session": False, "expected_intent": "Analytics", "expected_category": "Analytics", "min_risk": 40},
    {"name": "_hjid", "domain": "hotjar.com", "session": False, "expected_intent": "Analytics", "expected_category": "Analytics", "min_risk": 50},
    {"name": "ajs_user_id", "domain": "segment.io", "session": False, "expected_intent": "Analytics", "expected_category": "Analytics", "min_risk": 45},
    {"name": "heap_user_id", "domain": "heap.io", "session": False, "expected_intent": "Analytics", "expected_category": "Analytics", "min_risk": 45},
    {"name": "fs_uid", "domain": "fullstory.com", "session": False, "expected_intent": "Tracking", "expected_category": "Analytics", "min_risk": 55},
    {"name": "intercom-id", "domain": "intercom.io", "session": False, "expected_intent": "Analytics", "expected_category": "Analytics", "min_risk": 40},
    
    # ========== ADVERTISING COOKIES (High Risk) ==========
    {"name": "_fbp", "domain": "facebook.com", "session": False, "expected_intent": "Advertising", "expected_category": "Advertising", "min_risk": 60},
    {"name": "_fbc", "domain": "facebook.com", "session": False, "expected_intent": "Advertising", "expected_category": "Advertising", "min_risk": 60},
    {"name": "fr", "domain": "facebook.com", "session": False, "expected_intent": "Advertising", "expected_category": "Advertising", "min_risk": 65},
    {"name": "IDE", "domain": "doubleclick.net", "session": False, "expected_intent": "Advertising", "expected_category": "Advertising", "min_risk": 70},
    {"name": "NID", "domain": "google.com", "session": False, "expected_intent": "Advertising", "expected_category": "Advertising", "min_risk": 55},
    {"name": "test_cookie", "domain": "doubleclick.net", "session": True, "expected_intent": "Advertising", "expected_category": "Advertising", "min_risk": 50},
    {"name": "muc_ads", "domain": "t.co", "session": False, "expected_intent": "Advertising", "expected_category": "Advertising", "min_risk": 60},
    {"name": "personalization_id", "domain": "twitter.com", "session": False, "expected_intent": "Advertising", "expected_category": "Advertising", "min_risk": 65},
    {"name": "ads_prefs", "domain": "twitter.com", "session": False, "expected_intent": "Advertising", "expected_category": "Advertising", "min_risk": 60},
    {"name": "_uetsid", "domain": "bing.com", "session": False, "expected_intent": "Advertising", "expected_category": "Advertising", "min_risk": 55},
    
    # ========== TRACKING COOKIES (Highest Risk) ==========
    {"name": "uuid", "domain": "ad-tracker.com", "session": False, "expected_intent": "Tracking", "expected_category": "Tracking", "min_risk": 70},
    {"name": "visitor_id", "domain": "cross-site-tracker.net", "session": False, "expected_intent": "Tracking", "expected_category": "Tracking", "min_risk": 70},
    {"name": "device_id", "domain": "fingerprint.io", "session": False, "expected_intent": "Tracking", "expected_category": "Tracking", "min_risk": 75},
    {"name": "__cfduid", "domain": "tracker.com", "session": False, "expected_intent": "Tracking", "expected_category": "Tracking", "min_risk": 60},
    {"name": "li_sugr", "domain": "linkedin.com", "session": False, "expected_intent": "Tracking", "expected_category": "Tracking", "min_risk": 60},
    {"name": "bcookie", "domain": "linkedin.com", "session": False, "expected_intent": "Tracking", "expected_category": "Tracking", "min_risk": 55},
    {"name": "YSC", "domain": "youtube.com", "session": True, "expected_intent": "Tracking", "expected_category": "Tracking", "min_risk": 50},
    {"name": "VISITOR_INFO1_LIVE", "domain": "youtube.com", "session": False, "expected_intent": "Tracking", "expected_category": "Tracking", "min_risk": 60},
    {"name": "sync_cookie", "domain": "data-broker.org", "session": False, "expected_intent": "Tracking", "expected_category": "Tracking", "min_risk": 75},
    {"name": "uid", "domain": "advertising-network.com", "session": False, "expected_intent": "Tracking", "expected_category": "Tracking", "min_risk": 70},
]

# ============================================
# TEST DATASET - TERMS & CONDITIONS
# ============================================

TERMS_TEST_CASES = [
    {
        "text": "We collect your name, email address, and phone number when you create an account. This information is stored securely and never shared with third parties without your explicit consent.",
        "expected_flags": ["Data collection"],
        "max_risk": 30
    },
    {
        "text": "By using our service, you agree that we may share your personal information with our advertising partners, including but not limited to Facebook, Google, and other third-party networks for targeted advertising purposes.",
        "expected_flags": ["Data sharing", "Advertising"],
        "min_risk": 60
    },
    {
        "text": "We reserve the right to terminate your account at any time without prior notice or explanation. All data associated with terminated accounts will be permanently deleted.",
        "expected_flags": ["Account termination"],
        "min_risk": 50
    },
    {
        "text": "Our liability is limited to the amount you paid us in the last 12 months. We are not responsible for any indirect, incidental, or consequential damages.",
        "expected_flags": ["Legal liability", "Limitation of damages"],
        "min_risk": 40
    },
    {
        "text": "We use cookies and tracking technologies to monitor your browsing behavior across different websites. This data is used to create a profile of your interests and preferences for advertising purposes.",
        "expected_flags": ["Tracking", "Data collection", "Advertising"],
        "min_risk": 70
    },
    {
        "text": "You can delete your account and all associated data at any time through your account settings. We will process your deletion request within 30 days.",
        "expected_flags": [],
        "max_risk": 20
    },
    {
        "text": "By continuing to use the website, you consent to our use of cookies. You may adjust your cookie preferences at any time. Essential cookies cannot be disabled.",
        "expected_flags": ["User consent", "Cookies"],
        "max_risk": 35
    },
    {
        "text": "We may sell or transfer your data to third parties in the event of a merger, acquisition, or bankruptcy. You will be notified of such transfers.",
        "expected_flags": ["Data sharing", "Data transfer"],
        "min_risk": 55
    },
    {
        "text": "You grant us a worldwide, perpetual, irrevocable license to use, modify, and distribute any content you submit to our platform.",
        "expected_flags": ["Content license", "User rights"],
        "min_risk": 50
    },
    {
        "text": "We take your privacy seriously. Your data is encrypted in transit and at rest. We regularly audit our security practices and comply with GDPR and CCPA.",
        "expected_flags": [],
        "max_risk": 25
    }
]

# ============================================
# EVALUATION FUNCTIONS
# ============================================

def test_cookie(case: dict) -> dict:
    """Send a cookie to the API and return prediction + correctness"""
    payload = {
        "name": case["name"],
        "domain": case["domain"],
        "path": "/",
        "secure": True,
        "httpOnly": True,
        "sameSite": "Lax",
        "session": case.get("session", True),
        "expirationDate": None if case.get("session", True) else time.time() + 86400 * 365
    }
    
    try:
        resp = requests.post(API_URL, json=payload, timeout=60)
        result = resp.json()
    except Exception as e:
        return {"error": str(e), "case": case}
    
    # Check Intent
    intent_correct = result.get("cookie_intent", "").lower() == case["expected_intent"].lower()
    
    # Check Category
    category_correct = result.get("category", "").lower() == case["expected_category"].lower()
    
    # Check Risk Score
    score = result.get("risk_score", 0)
    if "max_risk" in case:
        risk_correct = score <= case["max_risk"]
    elif "min_risk" in case:
        risk_correct = score >= case["min_risk"]
    else:
        risk_correct = True  # No constraint
    
    return {
        "name": case["name"],
        "predicted_intent": result.get("cookie_intent"),
        "expected_intent": case["expected_intent"],
        "intent_correct": intent_correct,
        "predicted_category": result.get("category"),
        "expected_category": case["expected_category"],
        "category_correct": category_correct,
        "predicted_risk": score,
        "risk_constraint": f"<={case.get('max_risk')}" if "max_risk" in case else f">={case.get('min_risk')}",
        "risk_correct": risk_correct
    }

def test_terms(case: dict) -> dict:
    """Send a terms chunk to the API and return prediction + correctness"""
    try:
        resp = requests.post(TERMS_API_URL, json={"text": case["text"]}, timeout=60)
        result = resp.json()
    except Exception as e:
        return {"error": str(e), "case": case}
    
    # Check Risk Score
    score = result.get("risk_score", 0)
    if "max_risk" in case:
        risk_correct = score <= case["max_risk"]
    elif "min_risk" in case:
        risk_correct = score >= case["min_risk"]
    else:
        risk_correct = True
    
    # Check if any expected flags are found
    predicted_flags = [f.lower() for f in result.get("risk_flags", [])]
    found_flags = 0
    for expected in case.get("expected_flags", []):
        # Fuzzy match: check if expected keyword appears in any predicted flag
        for pred in predicted_flags:
            if expected.lower() in pred or pred in expected.lower():
                found_flags += 1
                break
    
    flags_accuracy = found_flags / len(case["expected_flags"]) if case["expected_flags"] else 1.0
    
    return {
        "text_preview": case["text"][:60] + "...",
        "predicted_risk": score,
        "risk_constraint": f"<={case.get('max_risk')}" if "max_risk" in case else f">={case.get('min_risk')}",
        "risk_correct": risk_correct,
        "predicted_flags": result.get("risk_flags", []),
        "expected_flags": case.get("expected_flags", []),
        "flags_accuracy": flags_accuracy
    }

def run_evaluation():
    print("=" * 60)
    print("TrustLayer ML Model Evaluation")
    print("=" * 60)
    
    # Check if server is running
    try:
        health = requests.get("http://localhost:8000/health", timeout=5).json()
        print(f"\n✓ Server Status: {health.get('status')}")
        print(f"✓ Model: {health.get('model')}")
    except:
        print("\n✗ ERROR: Server not running. Start with: python server.py")
        return
    
    if health.get("status") != "ready":
        print("\n✗ ERROR: Model not ready. Wait for model to load.")
        return
    
    # ========== COOKIE EVALUATION ==========
    print("\n" + "=" * 60)
    print("COOKIE CLASSIFICATION EVALUATION")
    print(f"Testing {len(COOKIE_TEST_CASES)} cookies...")
    print("=" * 60)
    
    cookie_results = []
    for i, case in enumerate(COOKIE_TEST_CASES):
        print(f"  [{i+1}/{len(COOKIE_TEST_CASES)}] Testing: {case['name']} @ {case['domain']}", end=" ")
        result = test_cookie(case)
        cookie_results.append(result)
        
        status = "✓" if (result.get("intent_correct") and result.get("risk_correct")) else "✗"
        print(f"-> {status}")
    
    # Calculate Cookie Metrics
    intent_correct = sum(1 for r in cookie_results if r.get("intent_correct"))
    category_correct = sum(1 for r in cookie_results if r.get("category_correct"))
    risk_correct = sum(1 for r in cookie_results if r.get("risk_correct"))
    total = len(cookie_results)
    
    print("\n--- COOKIE RESULTS ---")
    print(f"Intent Accuracy:   {intent_correct}/{total} ({100*intent_correct/total:.1f}%)")
    print(f"Category Accuracy: {category_correct}/{total} ({100*category_correct/total:.1f}%)")
    print(f"Risk Compliance:   {risk_correct}/{total} ({100*risk_correct/total:.1f}%)")
    
    # ========== TERMS EVALUATION ==========
    print("\n" + "=" * 60)
    print("TERMS & CONDITIONS EVALUATION")
    print(f"Testing {len(TERMS_TEST_CASES)} T&C samples...")
    print("=" * 60)
    
    terms_results = []
    for i, case in enumerate(TERMS_TEST_CASES):
        print(f"  [{i+1}/{len(TERMS_TEST_CASES)}] Testing: {case['text'][:40]}...", end=" ")
        result = test_terms(case)
        terms_results.append(result)
        
        status = "✓" if result.get("risk_correct") else "✗"
        print(f"-> {status}")
    
    # Calculate Terms Metrics
    terms_risk_correct = sum(1 for r in terms_results if r.get("risk_correct"))
    avg_flags_accuracy = sum(r.get("flags_accuracy", 0) for r in terms_results) / len(terms_results)
    
    print("\n--- T&C RESULTS ---")
    print(f"Risk Compliance:   {terms_risk_correct}/{len(terms_results)} ({100*terms_risk_correct/len(terms_results):.1f}%)")
    print(f"Flag Detection:    {100*avg_flags_accuracy:.1f}% (average)")
    
    # ========== OVERALL SUMMARY ==========
    print("\n" + "=" * 60)
    print("OVERALL SUMMARY")
    print("=" * 60)
    
    overall_correct = intent_correct + terms_risk_correct
    overall_total = total + len(terms_results)
    
    print(f"\nTotal Tests Run:       {overall_total}")
    print(f"Cookie Tests:          {total}")
    print(f"T&C Tests:             {len(terms_results)}")
    print(f"\nCombined Accuracy:     {100*overall_correct/overall_total:.1f}%")
    
    # Detailed breakdown for cookies by category
    print("\n--- COOKIE BREAKDOWN BY INTENT ---")
    intents = ["Authentication", "Security", "Preference", "Analytics", "Advertising", "Tracking"]
    for intent in intents:
        cases_for_intent = [r for r in cookie_results if r.get("expected_intent") == intent]
        if cases_for_intent:
            correct = sum(1 for r in cases_for_intent if r.get("intent_correct"))
            print(f"  {intent:15}: {correct}/{len(cases_for_intent)} ({100*correct/len(cases_for_intent):.0f}%)")
    
    # Save detailed results to JSON
    output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "cookie_results": cookie_results,
        "terms_results": terms_results,
        "summary": {
            "cookie_intent_accuracy": f"{100*intent_correct/total:.1f}%",
            "cookie_category_accuracy": f"{100*category_correct/total:.1f}%",
            "cookie_risk_compliance": f"{100*risk_correct/total:.1f}%",
            "terms_risk_compliance": f"{100*terms_risk_correct/len(terms_results):.1f}%",
            "terms_flag_detection": f"{100*avg_flags_accuracy:.1f}%"
        }
    }
    
    with open("eval_results.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"\n✓ Detailed results saved to: eval_results.json")

if __name__ == "__main__":
    run_evaluation()
