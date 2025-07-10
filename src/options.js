// src/options.js
import NXStorage from './storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const settingsMap = {
    'collapseListTLDs': { path: ['SecurityPage', 'CollapseList'], type: 'boolean', default: true },
    'collapseListBlocklists': { path: ['PrivacyPage', 'CollapseList'], type: 'boolean', default: true },
    'sortAZblocklists': { path: ['PrivacyPage', 'SortAZ'], type: 'boolean', default: false },
    'sortAZdomains': { path: ['AllowDenylistPage', 'SortAZ'], type: 'boolean', default: false },
    'sortTLDs': { path: ['AllowDenylistPage', 'SortTLD'], type: 'boolean', default: false },
    'bold': { path: ['AllowDenylistPage', 'Bold'], type: 'boolean', default: false },
    'lighten': { path: ['AllowDenylistPage', 'Lighten'], type: 'boolean', default: false },
    'rightAligned': { path: ['AllowDenylistPage', 'RightAligned'], type: 'boolean', default: false },
    'multilineTextBox': { path: ['AllowDenylistPage', 'MultilineTextBox'], type: 'boolean', default: false },
    'showCounters': { path: ['LogsPage', 'ShowCounters'], type: 'boolean', default: false },
    'domainsToHide': { path: ['LogsPage', 'DomainsToHide'], type: 'textarea', default: ["nextdns.io", ".in-addr.arpa", ".ip6.arpa"] }
  };

  let NXsettingsGlobal = await NXStorage.get('NXsettings');

  if (!NXsettingsGlobal || typeof NXsettingsGlobal !== 'object') {
    console.warn('Options: NXsettings not found or invalid, initializing with defaults.');
    NXsettingsGlobal = {};
    for (const id in settingsMap) {
        const info = settingsMap[id];
        let currentRef = NXsettingsGlobal;
        info.path.forEach((key, index) => {
            if (index === info.path.length - 1) {
                currentRef[key] = info.default;
            } else {
                if (!currentRef[key]) currentRef[key] = {};
                currentRef = currentRef[key];
            }
        });
    }
    // No save here, assume content script or background handles first-time save if this page is visited first.
  }

  function getSettingValue(path, defaultValue) {
    let current = NXsettingsGlobal;
    try {
      for (const key of path) {
        if (current === undefined || current === null) return defaultValue;
        current = current[key];
      }
      return current === undefined ? defaultValue : current;
    } catch (_e) { // Mark e as unused
      return defaultValue;
    }
  }

  function setSettingValue(path, value) {
    let current = NXsettingsGlobal;
    path.forEach((key, index) => {
      if (index === path.length - 1) {
        current[key] = value;
      } else {
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
    });
  }

  async function populateAndListen() {
    for (const id in settingsMap) {
      const element = document.getElementById(id);
      const settingInfo = settingsMap[id];

      if (element) {
        const currentValue = getSettingValue(settingInfo.path, settingInfo.default);

        if (settingInfo.type === 'boolean') {
          element.checked = !!currentValue;
        } else if (settingInfo.type === 'textarea') {
          element.value = Array.isArray(currentValue) ? currentValue.join('\n') : (currentValue || '');
        }

        element.addEventListener('change', async (event) => {
          let valueToSet;
          if (settingInfo.type === 'boolean') {
            valueToSet = event.target.checked;
          } else if (settingInfo.type === 'textarea') {
            valueToSet = event.target.value.split('\n').map(s => s.trim()).filter(s => s !== '');
          }

          setSettingValue(settingInfo.path, valueToSet);
          await NXStorage.set('NXsettings', NXsettingsGlobal);
          console.log(`Options: Setting ${settingInfo.path.join('.')} updated.`);
          showSaveNotification();
        });
      } else {
        console.warn(`Options: Element with ID '${id}' not found.`);
      }
    }
  }

  await populateAndListen();

  // eslint-disable-next-line no-unused-vars
  NXStorage.onChanged((changes, areaName) => { // areaName might be useful
    if (changes.NXsettings && changes.NXsettings.newValue) {
        console.log("Options: NXsettings changed remotely, repopulating UI.");
        NXsettingsGlobal = changes.NXsettings.newValue;
        populateAndListen(); // Re-populate all fields
    }
  });

  function showSaveNotification() {
    let notification = document.getElementById('saveNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'saveNotification';
        notification.style.cssText = "position: fixed; bottom: 20px; right: 20px; background-color: #4CAF50; color: white; padding: 10px; border-radius: 3px; z-index: 100; transition: opacity 0.5s ease; opacity: 0;";
        document.body.appendChild(notification);
    }
    notification.textContent = 'Settings saved!';
    notification.style.opacity = '1';
    if(notification.timer) clearTimeout(notification.timer);
    notification.timer = setTimeout(() => {
        notification.style.opacity = '0';
    }, 2000);
  }
});
