// src/background.js
import NXStorage from './storage.js';

class NXEnhancedBackground {
  constructor() {
    this.geminiApiKey = null;
    this.initialize();
  }

  async initialize() {
    await this.loadApiKey();
    this.initializeListeners();
    console.log('NXEnhanced Background Service Worker Initialized');
  }

  async loadApiKey() {
    this.geminiApiKey = await NXStorage.get('geminiApiKey');
    if (!this.geminiApiKey) {
      console.warn('NXEnhanced: Gemini API Key not found in storage. AI features will be disabled.');
    }
  }

  initializeListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // eslint-disable-next-line no-unused-vars
      this.handleMessage(request, sender).then(sendResponse); // sender might be useful later for security checks
      return true; // Required to indicate sendResponse will be called asynchronously
    });

    // eslint-disable-next-line no-unused-vars
    NXStorage.onChanged((changes, areaName) => { // areaName might be useful if we use different storage areas
      if (changes.geminiApiKey) {
        this.geminiApiKey = changes.geminiApiKey.newValue;
        console.log('NXEnhanced: Gemini API Key updated.');
        // Optionally, notify UI components if the API key status changes
        chrome.runtime.sendMessage({ action: 'apiKeyStatusChanged', apiKeySet: !!this.geminiApiKey }).catch(e => console.debug("Error sending apiKeyStatusChanged message, perhaps no listeners:", e));
      }
    });
  }

  async handleMessage(request, _sender) { // Mark sender as unused with underscore
    console.log('NXEnhanced Background: Received message:', request);
    switch (request.action) {
      case 'updateDomainList':
        console.log('NXEnhanced Background: updateDomainList action called with data:', request.data);
        return { success: true, message: 'Domain list update initiated (placeholder)' };
      case 'exportSettings': { // Added braces for lexical declaration
        console.log('NXEnhanced Background: exportSettings action called');
        const settings = await NXStorage.getMultiple(null); // Export all settings
        return { success: true, data: settings };
      }
      case 'analyzeLogs':
        if (!request.logs) {
          return { success: false, error: 'No logs provided for analysis.' };
        }
        return await this.analyzeLogsWithGemini(request.logs);
      case 'getApiKeyStatus':
        return { success: true, apiKeySet: !!this.geminiApiKey };
      default:
        console.warn('NXEnhanced Background: Unknown action:', request.action);
        return { success: false, error: 'Unknown action' };
    }
  }

  async analyzeLogsWithGemini(logs) {
    if (!this.geminiApiKey) {
      return { success: false, error: 'Gemini API Key is not set. Cannot analyze logs.' };
    }
    if (!logs || (Array.isArray(logs) && logs.length === 0) || (typeof logs === 'object' && Object.keys(logs).length === 0 && typeof logs !== 'string') ) {
        return { success: false, error: 'No log data provided to analyze.' };
    }

    try {
      const logString = typeof logs === 'string' ? logs : JSON.stringify(logs, null, 2);
      const prompt = `Analyze these NextDNS logs and suggest domains to block. Provide a brief reason for each suggestion. Focus on potential tracking, ads, or malicious domains. Logs:\n${logString}`;

      console.log('NXEnhanced Background: Analyzing logs with Gemini...');

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`;
      const geminiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
          // Add generationConfig if needed, e.g., temperature, maxOutputTokens
          // "generationConfig": {
          //   "temperature": 0.7,
          //   "maxOutputTokens": 1000
          // }
        })
      });

      if (!geminiResponse.ok) {
        const errorBody = await geminiResponse.json().catch(() => ({ error: { message: 'Failed to parse error response from API.'} }));
        console.error('NXEnhanced Background: Gemini API request failed:', geminiResponse.status, errorBody);
        return { success: false, error: `Gemini API error: ${errorBody.error?.message || geminiResponse.statusText}` };
      }

      const result = await geminiResponse.json();

      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        return { success: true, analysis: result.candidates[0].content.parts[0].text };
      } else if (result.promptFeedback && result.promptFeedback.blockReason) {
        console.error('NXEnhanced Background: Gemini content blocked:', result.promptFeedback.blockReason, result.promptFeedback.safetyRatings);
        return { success: false, error: `Content generation blocked by API: ${result.promptFeedback.blockReason}`};
      } else {
        console.warn('NXEnhanced Background: Gemini response format unexpected or empty:', result);
        return { success: false, error: 'Unexpected response format or empty content from Gemini API.' };
      }
    } catch (error) {
      console.error('NXEnhanced Background: Error analyzing logs with Gemini:', error);
      return { success: false, error: `Client-side error: ${error.message}` };
    }
  }
}

// Ensure only one instance is created
if (typeof self.nxEnhancedBgInstance === 'undefined') {
  self.nxEnhancedBgInstance = new NXEnhancedBackground();
}
export default self.nxEnhancedBgInstance; // Though for service workers, instantiation is enough.
