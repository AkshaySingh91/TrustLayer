# 🧪 Testing Guide - T&C AI Analyzer Extension

This guide will help you test the complete flow from content extraction to visualization.

## 🚀 Setup Testing Environment

### 1. Start Backend Server
```bash
cd Backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend is running by visiting: `http://localhost:8000`
You should see: `{"message": "✅ API running — models connected locally!"}`

### 2. Load Extension in Chrome
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `terms-ai-extension` folder
5. Verify extension appears with T&C Analyzer icon

## 🎯 Test Cases

### Test Case 1: Basic Functionality Check

**Objective**: Verify extension components load correctly

**Steps**:
1. Click the extension icon in Chrome toolbar
2. Popup should open with modern UI
3. Check "Backend Status" in footer shows "Connected"
4. Click "Check Backend" button
5. Should show success message

**Expected Results**:
- ✅ Popup opens without errors
- ✅ Backend status shows "Connected"
- ✅ All UI elements are properly styled
- ✅ No console errors in DevTools

### Test Case 2: Content Detection

**Objective**: Test smart T&C content detection

**Test Sites**:
- Google Terms: `https://policies.google.com/terms`
- Facebook Terms: `https://www.facebook.com/legal/terms`
- Twitter Terms: `https://twitter.com/en/tos`

**Steps**:
1. Navigate to a test site
2. Wait for page to fully load
3. Look for floating "Analyze T&C" button (bottom-right)
4. Click the floating button
5. Observe loading animation
6. Check results in popup

**Expected Results**:
- ✅ Floating button appears on page
- ✅ Button shows loading state when clicked
- ✅ Success message appears
- ✅ Popup shows analysis results

### Test Case 3: Full Analysis Flow

**Objective**: Test complete analysis pipeline

**Steps**:
1. Go to `https://policies.google.com/terms`
2. Click extension icon to open popup
3. Click "Analyze Current Page"
4. Wait for analysis to complete
5. Verify all result sections appear:
   - Risk Assessment with meter
   - AI Summary with stats
   - Risk Breakdown with categories
   - Recent Analyses history

**Expected Results**:
- ✅ Loading spinner with animated steps
- ✅ Risk meter chart displays correctly
- ✅ Summary text is readable and relevant
- ✅ Risk categories show with colored bars
- ✅ Analysis appears in recent history

### Test Case 4: Manual Text Analysis

**Objective**: Test manual text input analysis

**Steps**:
1. Open extension popup
2. Click "Manual Analysis" in no-content state, or
3. Use the manual analysis modal
4. Paste sample T&C text (minimum 100 characters)
5. Click "Analyze Text"
6. Verify results appear

**Sample Text**:
```
By using this service, you agree to our data collection practices. We may share your personal information with third parties for marketing purposes. Subscription will automatically renew unless cancelled 30 days in advance. Cancellation requires written notice and may result in fees. All disputes must be resolved through binding arbitration.
```

**Expected Results**:
- ✅ Modal opens and accepts text input
- ✅ Analysis processes successfully
- ✅ Risk assessment identifies key factors
- ✅ Summary captures main points

### Test Case 5: Error Handling

**Objective**: Test error scenarios and fallbacks

**Test Scenarios**:

**5a. Backend Offline**:
1. Stop the FastAPI server
2. Try to analyze content
3. Should show error state with retry option

**5b. No Content Found**:
1. Go to a page without T&C (e.g., `https://example.com`)
2. Try to analyze
3. Should show "No T&C Found" state

**5c. Invalid Content**:
1. Use manual analysis with very short text (< 100 chars)
2. Should show warning message

**Expected Results**:
- ✅ Clear error messages displayed
- ✅ Retry mechanisms work
- ✅ No crashes or broken states
- ✅ User can recover from errors

### Test Case 6: Interactive Features

**Objective**: Test UI interactivity and features

**Steps**:
1. Complete a successful analysis
2. Test these interactive elements:
   - Copy summary button
   - Toggle detailed risk analysis
   - Clear analysis history
   - Settings modal
   - Help documentation

**Expected Results**:
- ✅ Copy button provides feedback
- ✅ Detailed chart toggles correctly
- ✅ History clears when requested
- ✅ Settings save and persist
- ✅ All modals open/close properly

### Test Case 7: Visual Verification

**Objective**: Verify visual design and responsiveness

**Steps**:
1. Complete analysis on different risk levels
2. Check color coding:
   - High Risk: Red indicators
   - Medium Risk: Orange indicators  
   - Low Risk: Yellow/Green indicators
   - Very Low Risk: Green indicators
3. Verify charts render correctly
4. Check responsive behavior

**Expected Results**:
- ✅ Risk colors match severity levels
- ✅ Charts are properly sized and readable
- ✅ UI scales appropriately
- ✅ Animations are smooth

## 🔧 Debugging Tips

### Chrome DevTools
1. **Extension Popup**: Right-click extension icon → "Inspect popup"
2. **Content Script**: F12 on webpage → Console tab
3. **Background Script**: `chrome://extensions/` → "Inspect views: background page"

### Common Debug Commands
```javascript
// Check if extension is loaded
console.log('Extension status:', window.tcAnalyzerInitialized);

// Test backend connection
chrome.runtime.sendMessage({action: 'check_backend_status'}, console.log);

// Get stored analyses
chrome.storage.local.get(['analyses'], console.log);

// Clear extension storage
chrome.storage.local.clear();
```

### Backend Logs
Monitor FastAPI logs for:
- Incoming requests
- Processing times
- Error messages
- Model loading status

## 📊 Performance Testing

### Load Testing
1. Test with long T&C documents (> 10,000 words)
2. Verify analysis completes within reasonable time (< 30 seconds)
3. Monitor memory usage in Chrome Task Manager

### Stress Testing
1. Analyze multiple pages in quick succession
2. Verify caching works correctly
3. Check for memory leaks after extended use

### Network Testing
1. Test with slow network connection
2. Verify timeout handling
3. Check offline behavior

## ✅ Acceptance Criteria

Before considering the extension ready for use, verify:

- [ ] ✅ Backend server starts without errors
- [ ] ✅ Extension loads in Chrome without warnings
- [ ] ✅ Content detection works on major sites
- [ ] ✅ Analysis produces meaningful results
- [ ] ✅ All interactive features function correctly
- [ ] ✅ Error states are handled gracefully
- [ ] ✅ Visual design is polished and professional
- [ ] ✅ Performance is acceptable for typical use
- [ ] ✅ No console errors in normal operation
- [ ] ✅ Settings persist across browser sessions

## 🐛 Known Issues & Workarounds

### Issue 1: Content Not Detected
**Symptoms**: Floating button doesn't appear
**Workaround**: Use manual analysis or navigate to explicit T&C pages

### Issue 2: Slow Analysis
**Symptoms**: Analysis takes > 30 seconds
**Cause**: Large content or slow backend
**Workaround**: Reduce content size or optimize backend

### Issue 3: Chart Not Rendering
**Symptoms**: Empty chart areas
**Cause**: Chart.js loading issues
**Workaround**: Refresh extension or reload page

## 🚀 Ready for Production?

Once all test cases pass and acceptance criteria are met:

1. **Package Extension**: Create production build
2. **Update URLs**: Point to production backend
3. **Security Review**: Verify permissions and data handling
4. **Performance Optimization**: Implement any needed improvements
5. **Documentation**: Update user guides and help documentation

---

**Happy Testing! 🎉**

Report any issues or suggestions for improvement.