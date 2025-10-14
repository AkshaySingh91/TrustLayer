// Extension Testing and Validation Script
// Run this in the browser console on any page to test the extension

console.log("🧪 Starting Extension Test Suite...");

// Test 1: Check if extension is loaded
function testExtensionLoaded() {
  console.log("\n📋 Test 1: Extension Loading");
  
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    console.log("✅ Chrome extension context available");
    console.log("Extension ID:", chrome.runtime.id);
    return true;
  } else {
    console.log("❌ Chrome extension context not available");
    return false;
  }
}

// Test 2: Test message passing to background script
async function testBackgroundCommunication() {
  console.log("\n📋 Test 2: Background Communication");
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: "CHECK_ML_STATUS"
    });
    
    console.log("✅ Background script responded:", response);
    return response;
  } catch (error) {
    console.log("❌ Background communication failed:", error);
    return null;
  }
}

// Test 3: Test content script injection
function testContentScript() {
  console.log("\n📋 Test 3: Content Script");
  
  if (window.aiLegalAssistantInitialized) {
    console.log("✅ Content script loaded and initialized");
    return true;
  } else {
    console.log("❌ Content script not detected");
    return false;
  }
}

// Test 4: Test model status
async function testModelStatus() {
  console.log("\n📋 Test 4: ML Model Status");
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: "checkMLStatus"
    });
    
    console.log("Model status response:", response);
    
    if (response.status === "ready") {
      console.log("✅ ML models are ready");
      console.log("Summarization model:", response.models.summarization ? "✅" : "❌");
      console.log("Emotion model:", response.models.emotion ? "✅" : "❌");
    } else {
      console.log("⏳ ML models still loading");
    }
    
    return response;
  } catch (error) {
    console.log("❌ Model status check failed:", error);
    return null;
  }
}

// Test 5: Test terms detection
function testTermsDetection() {
  console.log("\n📋 Test 5: Terms Detection");
  
  const pageText = document.body.innerText.toLowerCase();
  const termsKeywords = ['terms of service', 'privacy policy', 'terms and conditions'];
  
  const foundKeywords = termsKeywords.filter(keyword => pageText.includes(keyword));
  
  if (foundKeywords.length > 0) {
    console.log("✅ Legal keywords found:", foundKeywords);
    return true;
  } else {
    console.log("ℹ️ No legal keywords found on this page");
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Running Extension Test Suite\n");
  
  const results = {
    extensionLoaded: testExtensionLoaded(),
    contentScript: testContentScript(),
    termsDetection: testTermsDetection()
  };
  
  results.backgroundCommunication = await testBackgroundCommunication();
  results.modelStatus = await testModelStatus();
  
  console.log("\n📊 Test Results Summary:");
  console.log("Extension Loaded:", results.extensionLoaded ? "✅" : "❌");
  console.log("Content Script:", results.contentScript ? "✅" : "❌");
  console.log("Background Communication:", results.backgroundCommunication ? "✅" : "❌");
  console.log("Model Status:", results.modelStatus ? "✅" : "❌");
  console.log("Terms Detection:", results.termsDetection ? "✅" : "ℹ️");
  
  if (results.extensionLoaded && results.backgroundCommunication && results.contentScript) {
    console.log("\n🎉 Extension is working correctly!");
  } else {
    console.log("\n⚠️ Extension has some issues that need to be resolved.");
  }
  
  return results;
}

// Auto-run tests
runAllTests();

// Make functions available globally for manual testing
window.extensionTests = {
  runAllTests,
  testExtensionLoaded,
  testBackgroundCommunication,
  testContentScript,
  testModelStatus,
  testTermsDetection
};