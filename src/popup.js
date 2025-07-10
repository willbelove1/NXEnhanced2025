// src/popup.js
import NXStorage from './storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const darkModeToggle = document.getElementById('darkModeToggle');

  const nextdnsApiTokenInput = document.getElementById('nextdnsApiToken');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const saveApiKeysBtn = document.getElementById('saveApiKeysBtn'); // Changed from saveApiKeyBtn

  const nextdnsApiKeyStatusSpan = document.getElementById('nextdnsApiKeyStatus');
  const geminiApiKeyStatusSpan = document.getElementById('geminiApiKeyStatus'); // Changed from apiKeyStatusSpan

  const analyzeLogsBtn = document.getElementById('analyzeLogsBtn');
  const analysisResultDiv = document.getElementById('analysisResult');
  const logsTextarea = document.getElementById('logsInput');
  const openOptionsPageBtn = document.getElementById('openOptionsPage');

  // --- Initialize UI States ---
  async function initializeUI() {
    // Dark Mode Toggle & Popup Theme
    if (darkModeToggle) {
      const currentSettings = await NXStorage.get('NXsettings');
      if (currentSettings && currentSettings.darkMode) {
        darkModeToggle.checked = true;
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }

    // API Key Inputs and Statuses
    if (nextdnsApiTokenInput) {
      const storedNextdnsKey = await NXStorage.get('nextdnsApiToken');
      if (storedNextdnsKey) {
        nextdnsApiTokenInput.value = storedNextdnsKey;
      }
      updateApiKeyStatus('nextdnsApiToken', storedNextdnsKey, nextdnsApiKeyStatusSpan);
    }
    if (geminiApiKeyInput) {
      const storedGeminiKey = await NXStorage.get('geminiApiKey');
      if (storedGeminiKey) {
        geminiApiKeyInput.value = storedGeminiKey;
      }
      // For Gemini, we can also check with background if it's considered "active"
      // This reuses the existing mechanism that messages background for gemini key status
      updateGeminiApiKeyStatusWithBackground();
    }
  }

  await initializeUI(); // Call initialization

  // --- Event Listeners ---
  if (openOptionsPageBtn) {
    openOptionsPageBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'exportSettings' });
        if (response && response.success && response.data) {
          const config = response.data;
          const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `nx-enhanced-config-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showPopupNotification('Configuration exported successfully!');
        } else {
          showPopupNotification(`Export failed: ${response.error || 'Unknown error'}`, 'error');
        }
      } catch (e) {
        showPopupNotification(`Export error: ${e.message}`, 'error');
        console.error("Export error:", e);
      }
    });
  }

  if (importBtn) {
    importBtn.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const importedConfig = JSON.parse(e.target.result);
            let currentSettings = await NXStorage.get('NXsettings') || {};

            // Merge NXsettings carefully if it exists in importedConfig
            if (importedConfig.NXsettings && typeof importedConfig.NXsettings === 'object') {
                currentSettings = { ...currentSettings, ...importedConfig.NXsettings };
            }

            // Set other top-level keys from importedConfig
            for (const key in importedConfig) {
                if (Object.hasOwnProperty.call(importedConfig, key) && key !== 'NXsettings') {
                    await NXStorage.set(key, importedConfig[key]);
                }
            }
            await NXStorage.set('NXsettings', currentSettings); // Save potentially merged NXsettings

            showPopupNotification('Configuration imported! Reload pages for all changes to apply.');
            await initializeUI(); // Re-initialize UI to reflect new settings
          } catch (err) {
            showPopupNotification(`Error importing: ${err.message}`, 'error');
            console.error("Import error:", err);
          }
        };
        reader.readAsText(file);
        event.target.value = null; // Reset file input
      }
    });
  }

  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', async () => {
      let settings = await NXStorage.get('NXsettings') || {};
      settings.darkMode = darkModeToggle.checked;
      await NXStorage.set('NXsettings', settings);
      showPopupNotification(`Dark mode ${settings.darkMode ? 'enabled' : 'disabled'}.`);
      if (settings.darkMode) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    });
  }

  if (saveApiKeysBtn) {
    saveApiKeysBtn.addEventListener('click', async () => {
      let nextdnsKeySaved = false;
      let geminiKeySaved = false;

      if (nextdnsApiTokenInput) {
        const nextdnsKey = nextdnsApiTokenInput.value.trim();
        if (nextdnsKey) {
          await NXStorage.set('nextdnsApiToken', nextdnsKey);
          nextdnsKeySaved = true;
        } else {
          await NXStorage.remove('nextdnsApiToken');
        }
        updateApiKeyStatus('nextdnsApiToken', nextdnsKey, nextdnsApiKeyStatusSpan, 'NextDNS');
      }

      if (geminiApiKeyInput) {
        const geminiKey = geminiApiKeyInput.value.trim();
        if (geminiKey) {
          await NXStorage.set('geminiApiKey', geminiKey);
          geminiKeySaved = true;
        } else {
          await NXStorage.remove('geminiApiKey');
        }
        // Update Gemini status by querying background, as background might have additional checks
        updateGeminiApiKeyStatusWithBackground();
      }

      if (nextdnsKeySaved || geminiKeySaved) {
        showPopupNotification('API Keys updated!');
      } else if (!nextdnsApiTokenInput.value.trim() && !geminiApiKeyInput.value.trim()) {
        showPopupNotification('API Keys cleared.', 'info');
      } else {
         showPopupNotification('No changes to API keys.', 'info');
      }
    });
  }

  if (analyzeLogsBtn && logsTextarea) {
    analyzeLogsBtn.addEventListener('click', async () => {
      const logsText = logsTextarea.value;
      if (!logsText.trim()) {
        showPopupNotification('Please paste some logs to analyze.', 'error');
        return;
      }

      if (analysisResultDiv) {
        analysisResultDiv.textContent = 'Analyzing...';
        analysisResultDiv.className = 'status-info result-text';
      }
      analyzeLogsBtn.disabled = true;
      analyzeLogsBtn.textContent = 'Analyzing...';

      try {
        const response = await chrome.runtime.sendMessage({ action: 'analyzeLogs', logs: logsText });
        if (analysisResultDiv) {
            if (response && response.success) {
                analysisResultDiv.textContent = response.analysis;
                analysisResultDiv.className = 'status-success result-text';
            } else {
                analysisResultDiv.textContent = `Analysis failed: ${response.error || 'Unknown error'}`;
                analysisResultDiv.className = 'status-error result-text';
            }
        }
      } catch (e) {
        if (analysisResultDiv) {
            analysisResultDiv.textContent = `Analysis error: ${e.message}`;
            analysisResultDiv.className = 'status-error result-text';
        }
        console.error("Analysis error:", e);
      } finally {
        analyzeLogsBtn.disabled = false;
        analyzeLogsBtn.textContent = 'Analyze Logs with AI';
      }
    });
  }

  // --- Helper Functions ---
  function updateApiKeyStatus(keyName, keyValue, statusSpanElement, keyDisplayName = 'API Key') {
    if (statusSpanElement) {
      if (keyValue && keyValue.trim() !== '') {
        statusSpanElement.textContent = `${keyDisplayName} is SET.`;
        statusSpanElement.className = 'status-success';
      } else {
        statusSpanElement.textContent = `${keyDisplayName} is NOT SET.`;
        statusSpanElement.className = 'status-error';
      }
    }
  }

  async function updateGeminiApiKeyStatusWithBackground() {
    if (!geminiApiKeyStatusSpan) return;
    try {
      // This assumes background script has a way to validate/check Gemini key usability
      const response = await chrome.runtime.sendMessage({ action: 'getApiKeyStatus' }); // This was for Gemini
      if (response && response.success !== undefined) {
        updateApiKeyStatus('geminiApiKey', response.apiKeySet ? 'set' : '', geminiApiKeyStatusSpan, 'Gemini');
      } else {
        updateApiKeyStatus('geminiApiKey', '', geminiApiKeyStatusSpan, 'Gemini'); // Default to not set if error
         geminiApiKeyStatusSpan.textContent = "Gemini API Key: Status check failed.";
         geminiApiKeyStatusSpan.className = 'status-error';
      }
    } catch (e) {
      console.warn("Could not get Gemini API key status from background:", e.message);
      updateApiKeyStatus('geminiApiKey', '', geminiApiKeyStatusSpan, 'Gemini');
      geminiApiKeyStatusSpan.textContent = "Gemini API Key: Error checking status.";
      geminiApiKeyStatusSpan.className = 'status-error';
    }
  }

  // eslint-disable-next-line no-unused-vars
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'apiKeyStatusChanged') { // This message is from background about Gemini key
        updateApiKeyStatus('geminiApiKey', request.apiKeySet ? 'set' : '', geminiApiKeyStatusSpan, 'Gemini');
    }
    // Not sending a response, so can return false or nothing.
  });

  function showPopupNotification(message, type = 'success', duration = 3000) {
    const notificationElement = document.getElementById('popupNotification');
    if (!notificationElement) return;

    notificationElement.textContent = message;
    notificationElement.className = `popup-notification ${type}`;

    void notificationElement.offsetWidth;
    notificationElement.classList.add('show');

    if (notificationElement.timer) clearTimeout(notificationElement.timer);
    notificationElement.timer = setTimeout(() => {
      notificationElement.classList.remove('show');
    }, duration);
  }
});
