# Local AI Legal Assistant - Setup & Usage Guide

## 🚀 Quick Setup

### 1. Install the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the extension folder
4. The extension icon should appear in your browser toolbar

### 2. First Time Setup
- **No API keys needed!** Everything runs locally in your browser
- First time loading may take 1-2 minutes to download AI models
- Models are cached locally after first download
- **Total privacy**: No data ever leaves your browser

## 🤖 How It Works

### AI Models Used
1. **BART Summarization** (Facebook's distilbart-cnn-12-6)
   - Creates intelligent summaries of legal documents
   - Identifies key clauses and important sections

2. **DistilBERT Emotion Analysis** (Go-emotions model)
   - Analyzes emotional tone and risk indicators
   - Detects problematic language patterns

### Privacy Features
- ✅ **100% Local Processing**: All AI runs in your browser
- ✅ **No External APIs**: No data sent to servers
- ✅ **Offline Ready**: Works without internet after initial setup
- ✅ **No Tracking**: Zero data collection or analytics

## 📋 Using the Extension

### Automatic Detection
1. Visit any website with Terms of Service or Privacy Policy
2. Extension automatically detects legal document sections
3. Click the floating "Analyze with AI" button when it appears
4. Get instant AI-powered analysis and risk assessment

### Manual Analysis
1. Click the extension icon in your browser toolbar
2. Click "Analyze Current Page" button
3. Extension will scan the page for legal content
4. View results in the analysis panel

### Features
- **Smart Summarization**: Get the key points in plain English
- **Risk Analysis**: Identify potentially problematic clauses
- **Emotion Detection**: See the emotional tone of different sections
- **Multi-language Support**: Works with 8+ languages
- **Statistics Tracking**: See how much time you've saved

## ⚙️ Settings

### Auto-Detection
- **Enabled**: Automatically scans pages for legal documents
- **Disabled**: Only analyzes when you manually click

### Language Selection
- Choose your preferred language for analysis
- Supports: English, Spanish, French, German, Hindi, Chinese, Japanese, Arabic

## 🔧 Troubleshooting

### Extension Won't Load
1. Check that all files are in the extension folder
2. Make sure `manifest.json` is present
3. Reload the extension in `chrome://extensions/`

### AI Models Not Loading
1. Ensure you have a stable internet connection for initial download
2. Wait 2-3 minutes for first-time model loading
3. Check browser console for any error messages
4. Try refreshing the page and reloading the extension

### Analysis Not Working
1. Make sure the page contains legal text (Terms, Privacy Policy, etc.)
2. Check that the extension has permission to access the current site
3. Try clicking "Analyze Current Page" manually from the popup

### Performance Issues
1. Close other tabs to free up memory
2. Restart Chrome if models seem stuck
3. Clear extension data and reload (Settings → Reset All Data)

## 📊 Understanding Results

### Summary Section
- **Key Points**: Most important clauses identified by AI
- **Risk Level**: Overall assessment (Low/Medium/High)
- **Recommendation**: AI's suggestion for your review

### Emotion Analysis
- **Confidence**: How certain the AI is about the emotional tone
- **Dominant Emotions**: Primary emotional indicators found
- **Risk Indicators**: Specific concerning language patterns

### Visual Elements
- **Color Coding**: Green (safe), Yellow (caution), Red (concerning)
- **Progress Bars**: Show relative risk levels
- **Charts**: Visual representation of analysis results

## 🛠️ Advanced Usage

### Developer Mode
1. Open browser console (F12)
2. Monitor extension logs for debugging
3. Check Network tab to verify no external requests

### Model Information
- **BART Model Size**: ~500MB (cached after first download)
- **DistilBERT Size**: ~250MB (cached after first download)
- **Total Storage**: ~1GB for models and cache

### Customization
- Extension stores preferences in Chrome's sync storage
- Statistics are kept in local storage
- Clear data anytime via extension popup

## 🔒 Security & Privacy

### Data Handling
- **Input Text**: Processed locally, never transmitted
- **AI Models**: Downloaded once, cached locally
- **Results**: Stored locally, never shared
- **Settings**: Synced across Chrome instances only

### Permissions Explained
- **activeTab**: Read content of current page for analysis
- **storage**: Save settings and statistics locally
- **scripting**: Inject analysis interface into pages

## 📈 Performance Tips

### Optimal Usage
- Close unused tabs to maximize available memory
- Use on pages with clear legal document structure
- Allow full model loading before first analysis

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Browser**: Chrome 88+ or Edge 88+
- **Storage**: 2GB free space for model caching

## 🆘 Support

### Getting Help
1. Check this guide first for common issues
2. Look for error messages in browser console
3. Try reloading the extension and restarting browser
4. Reset extension data if problems persist

### Known Limitations
- Large documents (>50,000 words) may take longer to process
- Complex formatting might affect text extraction
- Some dynamic content requires page refresh for detection

---

## 🎯 Example Workflow

1. **Visit a website** with Terms of Service
2. **Wait for detection** (floating button appears)
3. **Click "Analyze with AI"** to start processing
4. **Review summary** and risk assessment
5. **Check emotion analysis** for concerning patterns
6. **Make informed decision** based on AI insights

**Remember**: This tool assists your review but doesn't replace legal advice for important agreements!