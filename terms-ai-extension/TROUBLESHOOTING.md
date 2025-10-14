# 🔧 Extension Troubleshooting Guide

## Current Issue: "Background received message: undefined"

### ✅ Fixes Applied

1. **Enhanced Message Validation**
   - Added proper null/undefined checks
   - Improved logging for unknown message types
   - Added try-catch blocks for error handling

2. **Robust Initialization**
   - Added retry logic with increasing delays
   - Limited retry attempts to prevent infinite loops
   - Better error reporting and debugging

3. **Safer Environment Configuration**
   - Proper Transformers.js environment setup
   - Enhanced progress callback handling
   - Global error handling for extension context

### 🧪 Testing Steps

#### Step 1: Load Extension with Debug Mode
```
1. Go to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the extension folder
5. Open Developer Tools (F12)
6. Go to Console tab
```

#### Step 2: Check Service Worker Console
```
1. In chrome://extensions/, click "service worker" under your extension
2. This opens the background script console
3. Look for initialization messages:
   ✅ "🚀 Starting Local ML Terms Analyzer initialization..."
   ✅ "✅ Local ML Terms Analyzer started successfully!"
   ❌ Any error messages
```

#### Step 3: Test with Debug Script
```
1. Open any webpage
2. Open browser console (F12)
3. Paste and run the content of test_extension.js
4. Check all test results
```

#### Step 4: Test ML Model Loading
```
1. Wait for models to download (first time: 1-2 minutes)
2. Check console for progress messages:
   ✅ "📖 Summarization model loading: XX%"
   ✅ "🎭 Emotion model loading: XX%"
   ✅ "🎉 All ML models initialized successfully!"
```

### 🐛 Common Issues & Solutions

#### Issue: "Failed to fetch" errors
**Solution:** 
- Check internet connection
- Wait for first-time model downloads
- Models are ~1GB total, takes time

#### Issue: "undefined" message logs
**Solution:** 
- Fixed with enhanced message validation
- Unknown messages now logged properly
- Won't cause crashes anymore

#### Issue: NaN% progress
**Solution:** 
- Fixed progress callback handling
- Added fallback for undefined progress values
- Better status reporting

#### Issue: Extension not loading
**Solution:** 
- Ensure all files are in folder
- Check manifest.json syntax
- Reload extension in chrome://extensions/

### 📊 Expected Console Output (Background)

```
🚀 Starting Local ML Terms Analyzer initialization...
✅ Local ML Terms Analyzer started successfully!
🚀 Initializing local ML models (attempt 1/3)...
📖 Loading BART summarization model...
📖 Summarization model loading: 25%
📖 Summarization model loading: 50%
📖 Summarization model loading: 100%
✅ BART summarization model loaded successfully!
🎭 Loading emotion analysis model...
🎭 Emotion model loading: 100%
✅ DistilBERT emotion model loaded successfully!
🎉 All ML models initialized successfully!
```

### 📊 Expected Console Output (Content)

```
Local AI Legal Assistant content script loaded
Content script initialized successfully
ML Models status: {bartReady: true, emotionReady: true}
Legal document detected on page: {indicators: true, ...}
```

### 🔍 Debug Commands

Run these in the background service worker console:

```javascript
// Check if analyzer exists
console.log("Analyzer exists:", typeof globalThis.mlAnalyzer);

// Check model status
if (globalThis.mlAnalyzer) {
  console.log("Initialized:", globalThis.mlAnalyzer.isInitialized);
  console.log("BART model:", !!globalThis.mlAnalyzer.summarizationModel);
  console.log("Emotion model:", !!globalThis.mlAnalyzer.emotionModel);
}

// Test message handling
chrome.runtime.sendMessage({type: "CHECK_ML_STATUS"}, console.log);
```

### 🎯 Quick Fix Checklist

- [ ] Extension loaded without errors
- [ ] Service worker console shows initialization
- [ ] Models downloading (first time)
- [ ] No "Failed to fetch" errors
- [ ] Content script loaded on pages
- [ ] Message passing working
- [ ] Terms detection functioning

### 🆘 If Problems Persist

1. **Clear Extension Data**
   ```
   Chrome Settings → Privacy → Clear browsing data → Extension data
   ```

2. **Use Debug Background**
   ```
   Temporarily change manifest.json:
   "service_worker": "background_debug.js"
   ```

3. **Check Browser Compatibility**
   ```
   Chrome 88+ or Edge 88+ required
   WebAssembly support needed
   ```

4. **Reset Extension**
   ```
   1. Remove extension
   2. Restart Chrome
   3. Reload extension
   4. Wait for model downloads
   ```

### 📞 Support Information

- **Models Used**: BART (distilbart-cnn-12-6), DistilBERT (go-emotions)
- **Storage Required**: ~1GB for models
- **First Run**: 1-2 minutes for model downloads
- **Offline**: Works after initial setup