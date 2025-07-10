// src/content.js
import NXStorage from './storage.js';
import PerformanceOptimizer from './performance.js';

const SLDs = ["co","com","org","edu","gov","mil","net", "ac", "ad", "ae", "af", "ag", "ai", "al", "am", "ao", "aq", "ar", "as", "at", "au", "aw", "ax", "az", "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bm", "bn", "bo", "br", "bs", "bt", "bv", "bw", "by", "bz", "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn", "cr", "cu", "cv", "cx", "cy", "cz", "de", "dj", "dk", "dm", "do", "dz", "ec", "ee", "eg", "er", "es", "et", "eu", "fi", "fj", "fk", "fm", "fo", "fr", "ga", "gb", "gd", "ge", "gf", "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy", "hk", "hm", "hn", "hr", "ht", "hu", "id", "ie", "il", "im", "in", "io", "iq", "ir", "is", "it", "je", "jm", "jo", "jp", "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz", "la", "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma", "mc", "md", "me", "mg", "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz", "na", "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz", "om", "pa", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py", "qa", "re", "ro", "rs", "ru", "rw", "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "st", "su", "sv", "sy", "sz", "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tp", "tr", "tt", "tv", "tw", "tz", "ua", "ug", "uk", "us", "uy", "uz", "va", "vc", "ve", "vg", "vi", "vn", "vu", "wf", "ws", "ye", "yt", "za", "zm", "zw"]; // More comprehensive list

class NXEnhancedContent {
  constructor() {
    this.NXsettings = null;
    this.performanceOptimizer = new PerformanceOptimizer();
    this.debouncedHandleMutations = this.performanceOptimizer.debounce(this.handleMutationsDirect.bind(this), 300);
    this.observer = new MutationObserver(this.debouncedHandleMutations);
    this.currentPage = location.href;
    this.intervals = [];
    this.pageSpecificIntervals = [];

    // Logs page specific state
    this.logsContainerElement = null;
    this.isLoadingLogs = false; // For full refreshes
    this.isLoadingMoreLogs = false; // For infinite scroll loading
    this.currentLogParams = {};
    this.logPaginationCursor = null;
    this.currentDeviceFilter = '';
    this.currentBeforeTimestamp = null;
    this.listBeforeTimestampChanged = false;
    this.currentSearchQuery = '';
    this.currentStatusFilter = '';
    this.isRawLogs = false;
    this.isStreamingLogs = false;
    this.logStreamWebsocket = null;
    this.lastLogEntryTimestamp = null;
    this.logsTimestampUpdaterIntervalId = null;
    this.logActionPopupElement = null;
    this.popupEscapeListener = null;
    this.popupOutsideClickListener = null;
    this.totalLoadedApiCount = 0;
    this.totalVisibleLogCount = 0;
    this.totalFilteredByHideListCount = 0;


    this.originalSetInterval = window.setInterval;
    this.originalClearInterval = window.clearInterval;

    window.setInterval = (func, delay, ...args) => {
      const id = this.originalSetInterval(func, delay, ...args);
      this.intervals.push(id);
      return id;
    };
    window.clearInterval = (id) => {
      this.intervals = this.intervals.filter(intervalId => intervalId !== id);
      this.pageSpecificIntervals = this.pageSpecificIntervals.filter(intervalId => intervalId !== id);
      this.originalClearInterval(id);
    };

    this.init();
  }

  async init() {
    console.log('NXEnhanced: Initializing content script...');
    await this.loadSettings();
    this.addGlobalStyles();
    this.extendNativePrototypes();
    this.main();

    let pageSwitchTimeout;
    this.pageSwitchInterval = this.originalSetInterval(() => {
      if (this.currentPage === location.href) return;
      clearTimeout(pageSwitchTimeout);
      pageSwitchTimeout = setTimeout(() => {
        console.log('NXEnhanced: Page switched from', this.currentPage, 'to', location.href);
        if (/\/logs/i.test(location.href) && this.currentPage && location.href.split("/")[3] !== this.currentPage.split("/")[3]) {
          this.originalClearInterval(this.pageSwitchInterval);
          location.reload();
          return;
        }
        this.currentPage = location.href;
        this.clearPageSpecificIntervals();
        const rowStyle = document.getElementById('nx-row-style');
        if (rowStyle) rowStyle.remove();
        const countersEl = document.getElementById('nx-log-counters-container');
        if (countersEl) countersEl.remove();
        this.main();
      }, 100);
    }, 250);
    this.intervals.push(this.pageSwitchInterval);

    this.startObserving();
    this.applyDarkMode();
  }

  async loadSettings() {
    let settings = await NXStorage.get('NXsettings');
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      settings = {
        SecurityPage: { CollapseList: true },
        PrivacyPage: { CollapseList: true, SortAZ: false },
        AllowDenylistPage: { SortAZ: false, SortTLD: false, Bold: false, Lighten: false, RightAligned: false, MultilineTextBox: false, DomainsDescriptions: {} },
        LogsPage: { ShowCounters: true, DomainsToHide: ["nextdns.io", ".in-addr.arpa", ".ip6.arpa"], DomainsFilteringEnabled: true }, // ShowCounters default true
        darkMode: false
      };
      await NXStorage.set('NXsettings', settings);
    }
    this.NXsettings = settings;
    if (!this.NXsettings.LogsPage) this.NXsettings.LogsPage = {};
    if (this.NXsettings.LogsPage.DomainsFilteringEnabled === undefined) this.NXsettings.LogsPage.DomainsFilteringEnabled = true;
    if (this.NXsettings.LogsPage.ShowCounters === undefined) this.NXsettings.LogsPage.ShowCounters = true;
    if (!this.NXsettings.LogsPage.DomainsToHide) this.NXsettings.LogsPage.DomainsToHide = ["nextdns.io", ".in-addr.arpa", ".ip6.arpa"];

    this.nextdnsApiToken = await NXStorage.get('nextdnsApiToken');
    this.geminiApiKey = await NXStorage.get('geminiApiKey');
    const urlConfigId = this.getConfigIdFromUrl();
    const storedConfigId = await NXStorage.get('nextdnsConfigId');
    this.configId = urlConfigId || storedConfigId;

    console.log('NXEnhanced: Settings, API keys, and Config ID loaded.', {
        NXsettings: this.NXsettings, nextdnsApiTokenSet: !!this.nextdnsApiToken,
        geminiApiKeySet: !!this.geminiApiKey, configId: this.configId
    });

    if (!this.nextdnsApiToken && this.isLogsPage()) {
        this.showNotification('NextDNS API Token not set. Some features like Allow/Deny might not work. Please set it in the extension popup.', 'error', 5000);
    }
    if (!this.configId && this.isLogsPage()) {
        this.showNotification('NextDNS Configuration ID could not be determined. API features may fail. Ensure you are on a specific configuration page or set it in options.', 'error', 5000);
    }

    NXStorage.onChanged(async (changes, areaName) => {
        if (changes.NXsettings) {
            this.NXsettings = changes.NXsettings.newValue; this.applyDarkMode(); this.main();
        }
        if (changes.nextdnsApiToken) this.nextdnsApiToken = changes.nextdnsApiToken.newValue;
        if (changes.geminiApiKey) this.geminiApiKey = changes.geminiApiKey.newValue;
        if (changes.nextdnsConfigId) {
            const currentUrlConfigId = this.getConfigIdFromUrl();
            this.configId = currentUrlConfigId || changes.nextdnsConfigId.newValue;
        }
    });
  }

  async saveSettings() {
    if (this.NXsettings) {
      await NXStorage.set('NXsettings', this.NXsettings);
      console.log('NXEnhanced: NXsettings (general settings) saved.');
    }
  }

  addGlobalStyles() {
    const styleId = 'nx-global-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      .list-group-item:hover .btn:not(.disabled) { visibility: visible !important; }
      .tooltipParent { position: relative; }
      .tooltipParent:hover .customTooltip { opacity: 1 !important; visibility: visible !important; }
      body:not(.nx-modal-open) .logs-main-area:hover > #nx-log-counters-container { visibility: hidden !important; opacity: 0 !important; transition: visibility 0.3s, opacity 0.3s; }
      .btn-light { background-color: #eee; border-color: #ddd; }
      .list-group-item:hover input.description, input.description:focus { display: initial !important;}
      .Logs .row > * { width: auto; }
      @keyframes nx-slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes nx-fade-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
      .nx-notification { position: fixed; bottom: 20px; right: 20px; background-color: #28a745; color: white; padding: 1rem; border-radius: 0.375rem; z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); opacity: 0; transform: translateX(100%); }
      .nx-notification.show { animation: nx-slide-in 0.5s forwards ease-out; }
      .nx-notification.hide { animation: nx-fade-out 0.5s forwards ease-in; }
      .nx-notification.error { background-color: #dc3545; } .nx-notification.info { background-color: #17a2b8; }
      body.nx-dark-mode .nx-btn-light { background-color: #444; color: #f0f0f0; border-color: #555; }
      body.nx-dark-mode .nx-notification { background-color: #374151; color: #f3f4f6; border: 1px solid #4b5563; }
      body.nx-dark-mode .nx-notification.error { background-color: #7f1d1d; color: #fecaca; }
      body.nx-dark-mode .nx-notification.info { background-color: #1e3a8a; color: #bfdbfe; }
      .nx-action-popup { position: fixed; background-color: white; border: 1px solid #ccc; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10001; min-width: 320px; }
      body.nx-dark-mode .nx-action-popup { background-color: #374151; color: #f3f4f6; border-color: #4b5563; }
      body.nx-dark-mode .nx-action-popup input[type="text"] { background-color: #4b5563; border-color: #6b7280; color: #f3f4f6; }
      body.nx-dark-mode .nx-action-popup .btn-primary { background-color: #2563eb; }
      body.nx-dark-mode .nx-action-popup .btn-secondary { background-color: #4b5563; }
      body.nx-dark-mode .nx-action-popup .btn-light { background-color: #4b5563; border-color: #6b7280; }
      #nx-log-counters-container { position: fixed; bottom: 20px; right: 20px; background: rgba(255,255,255,0.9); color: #333; padding: 8px 12px; border: 1px solid #ddd; border-radius: 5px; z-index: 9990; font-size: 0.8rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: visibility 0.2s, opacity 0.2s; }
      body.nx-dark-mode #nx-log-counters-container { background: rgba(50,50,50,0.9); color: #ccc; border-color: #555; }
      #nx-log-counters-container > div { margin-bottom: 3px; }
      #nx-log-counters-container b { font-weight: bold; }
    `;
    document.head.appendChild(style);
  }

  applyDarkMode() {
    if (this.NXsettings && this.NXsettings.darkMode) document.body.classList.add('nx-dark-mode');
    else document.body.classList.remove('nx-dark-mode');
  }

  extendNativePrototypes() {
    if (!Node.prototype.getByClass) Node.prototype.getByClass = function(cn) { return this.getElementsByClassName(cn)[0]; };
    if (!Node.prototype.getAllByClass) Node.prototype.getAllByClass = function(cn) { return this.getElementsByClassName(cn); };
    if (!Node.prototype.secondChild) Node.prototype.secondChild = function() { return this.children[1]; };
    if (!Array.prototype.lastItem) Array.prototype.lastItem = function() { return this[this.length - 1]; };
    if (!Node.prototype.createStylizedTooltip) {
      Node.prototype.createStylizedTooltip = function(content) {
        let tt = this.querySelector(':scope > .customTooltip');
        if (!tt) {
          tt = document.createElement("div"); tt.className = "customTooltip"; this.appendChild(tt);
          this.classList.add("tooltipParent"); if (getComputedStyle(this).position === 'static') this.style.position = 'relative';
        }
        tt.innerHTML = '';
        if (typeof content === "string") tt.innerHTML = content;
        else if (Array.isArray(content)) content.forEach(el => tt.appendChild(el.cloneNode(true)));
        else if (content instanceof Node) tt.appendChild(content.cloneNode(true));
        tt.style.cssText = 'position:absolute;background:#333;color:white;z-index:9999;font-family:var(--font-family-sans-serif,sans-serif);padding:7px;font-size:11px;font-weight:initial;text-align:center;border-radius:5px;line-height:1.5;margin-top:5px;min-width:100px;max-width:250px;visibility:hidden;opacity:0;transition:opacity .2s,visibility .2s;pointer-events:none;left:50%;transform:translateX(-50%);bottom:100%;margin-bottom:5px;';
      };
    }
  }

  clearPageSpecificIntervals() {
    this.pageSpecificIntervals.forEach(id => this.originalClearInterval(id));
    this.pageSpecificIntervals = [];
    this.clearLogsTimestampUpdater();
    const countersEl = document.getElementById("nx-log-counters-container");
    if (countersEl) countersEl.remove();
  }

  addPageSpecificInterval(func, delay, ...args) {
    const id = this.originalSetInterval(func, delay, ...args);
    this.pageSpecificIntervals.push(id); this.intervals.push(id); return id;
  }

  startObserving() {
    this.observer.observe(document.body, { childList: true, subtree: true, attributes: false });
    console.log('NXEnhanced: MutationObserver started.');
  }

  handleMutationsDirect(mutations) {
    if (this.isLogsPage()) {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const logsContainer = document.querySelector('.list-group.Logs-logs');
          if (logsContainer && Array.from(mutation.addedNodes).some(n => logsContainer.contains(n) || n === logsContainer)) {
            this.debouncedSetupLogsPage();
          }
        }
      });
    }
  }

  main() {
    this.applyDarkMode();
    if (this.isLogsPage()) this.debouncedSetupLogsPage();
  }

  isLogsPage() { return /\/logs/i.test(location.href); }
  get debouncedSetupLogsPage() { return this.performanceOptimizer.debounce(this.setupLogsPage.bind(this), 500); }

  async setupLogsPage() {
    this.logsContainerElement = this.getLogsContainerElement();
    if (!this.logsContainerElement) { console.warn("NXEnhanced: Logs container not found."); return; }
    this.injectDeviceFilterDropdown(); this.injectListQueriesBeforeUI(); this.injectDomainFiltersUI();
    this.injectLogsSearchUI(); this.injectLogsOptionsToggles(); this.injectLogCountersUI();
    this.setupLogsPageEventListeners();
    this.setupInfiniteScroll();
    await this.refreshLogs();
  }

  getLogsContainerElement() {
    if (!this.logsContainerElement || !document.body.contains(this.logsContainerElement)) {
      this.logsContainerElement = document.querySelector('.list-group.Logs-logs');
      if (!this.logsContainerElement) console.error('NXEnhanced: Logs container element (.list-group.Logs-logs) not found.');
    }
    return this.logsContainerElement;
  }

  async refreshLogs(clearExisting = true) {
    const params = { ...this.currentLogParams };
    if (this.currentDeviceFilter) params.device_id = this.currentDeviceFilter;
    if (this.currentBeforeTimestamp && this.listBeforeTimestampChanged) params.before = new Date(this.currentBeforeTimestamp).toISOString();

    if (clearExisting) {
        this.logPaginationCursor = null;
        this.lastLogEntryTimestamp = null;
        this.totalLoadedApiCount = 0; // Reset API count on full refresh
    }
    if (params.before) this.currentLogParams.before = params.before;
    else if (clearExisting) delete this.currentLogParams.before;
    await this.fetchLogsData(params, clearExisting);
  }

  async fetchLogsData(params = {}, clearLogs = true) {
    if (clearLogs && this.isLoadingLogs) { console.log('NXEnhanced: Already loading logs (full refresh), request skipped.'); return; }
    if (!clearLogs && this.isLoadingMoreLogs) { console.log('NXEnhanced: Already loading more logs, request skipped.'); return; }
    if (!this.configId) { this.showNotification('Config ID not set, cannot fetch logs.', 'error'); if(clearLogs) this.isLoadingLogs = false; else this.isLoadingMoreLogs = false; return; }

    if(clearLogs) this.isLoadingLogs = true; else this.isLoadingMoreLogs = true;
    if (clearLogs) this.showNotification('Fetching logs...', 'info', 2000);

    const queryParams = new URLSearchParams();
    const effectiveParams = { q: this.currentSearchQuery, status: this.currentStatusFilter, raw: this.isRawLogs ? '1' : undefined, device_id: this.currentDeviceFilter, ...params };
    if (effectiveParams.before) queryParams.append('before', effectiveParams.before);
    if (effectiveParams.device_id) queryParams.append('device_id', effectiveParams.device_id);
    if (effectiveParams.q) queryParams.append('q', effectiveParams.q);
    if (effectiveParams.status) queryParams.append('status', effectiveParams.status);
    if (effectiveParams.raw) queryParams.append('raw', effectiveParams.raw);
    if (effectiveParams.cursor) queryParams.append('cursor', effectiveParams.cursor);

    this.removeLogSentinel();

    try {
      const endpoint = `logs?${queryParams.toString()}`;
      const response = await this.makeApiRequest('GET', endpoint);
      const logs = response.data || [];

      // Update totalLoadedApiCount based on what's being added/set
      if (clearLogs) {
        this.totalLoadedApiCount = logs.length;
      } else {
        this.totalLoadedApiCount += logs.length;
      }

      if (logs.length > 0 && !clearLogs) this.lastLogEntryTimestamp = logs[0].timestamp;
      else if (logs.length > 0 && clearLogs) this.lastLogEntryTimestamp = logs[0].timestamp;
      this.renderLogEntries(logs, clearLogs);
      this.logPaginationCursor = response.meta?.pagination?.cursor || null;
      if (logs.length === 0 && clearLogs) this.showNotification('No logs found for the current filters.', 'info');
      if (logs.length === 0 && !clearLogs && !this.logPaginationCursor) this.showNotification('No more logs to load.', 'info', 1500);
    } catch (error) {
      this.showNotification(`Error fetching logs: ${error.message}`, 'error');
      const container = this.getLogsContainerElement();
      if (container && clearLogs) container.innerHTML = `<div class="p-4 text-red-500">Failed to load logs: ${error.message}</div>`;
    } finally {
      if(clearLogs) this.isLoadingLogs = false; else this.isLoadingMoreLogs = false;
    }
  }

  renderLogEntries(logDataArray, clear = true) {
    const container = this.getLogsContainerElement();
    if (!container) return;
    if (clear) {
        container.innerHTML = '';
        // this.totalLoadedApiCount is managed by fetchLogsData
    }
    if (!logDataArray || logDataArray.length === 0) {
      if (clear) {
        const noLogsMessage = document.createElement('div');
        noLogsMessage.className = 'p-4 text-center text-gray-500 body.dark:text-gray-400';
        noLogsMessage.textContent = 'No logs to display with current filters.';
        container.appendChild(noLogsMessage);
      }
      this.updateLogCounters();
      return;
    }
    const fragment = document.createDocumentFragment();
    logDataArray.forEach(logEntry => {
      const logElement = this.createLogEntryElement(logEntry);
      if (logElement) fragment.appendChild(logElement);
    });
    container.appendChild(fragment); // Append new entries

    this.applyDomainFilters(); this.filterDisplayedLogsByDevice();
    if (container.querySelector('.nx-timestamp')) this.startLogsTimestampUpdater();
    else this.clearLogsTimestampUpdater();
    this.removeLogSentinel();
    if (this.logPaginationCursor) this.injectLogSentinel(container);
    this.updateLogCounters();
  }

  injectLogSentinel(container) {
    if (!container) container = this.getLogsContainerElement();
    if (!container || document.getElementById('nx-log-sentinel')) return;
    const sentinel = document.createElement('div');
    sentinel.id = 'nx-log-sentinel';
    sentinel.className = 'p-4 text-center text-gray-500 body.dark:text-gray-400';
    sentinel.textContent = 'Loading more logs...';
    container.appendChild(sentinel);
    this.performanceOptimizer.observeElements('#nx-log-sentinel', (entry, observer) => {
        if (entry.target.id === 'nx-log-sentinel' && entry.isIntersecting) {
            observer.unobserve(entry.target);
            this.loadMoreLogs();
        }
    });
  }

  removeLogSentinel() {
    const sentinel = document.getElementById('nx-log-sentinel');
    if (sentinel) sentinel.remove();
  }

  async loadMoreLogs() {
    if (this.isLoadingLogs || this.isLoadingMoreLogs || !this.logPaginationCursor) {
        if (!this.logPaginationCursor) this.removeLogSentinel();
        return;
    }
    this.isLoadingMoreLogs = true;
    const params = { ...this.currentLogParams, cursor: this.logPaginationCursor };
    await this.fetchLogsData(params, false);
    this.isLoadingMoreLogs = false;
  }

  setupInfiniteScroll() { console.log("NXEnhanced: Infinite scroll observation mechanism is active."); }

  createLogEntryElement(log) {
    if (this.isRawLogs) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'log list-group-item nx-log-entry p-3 border-b border-gray-200 body.dark:border-gray-700 text-xs';
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap'; pre.style.wordBreak = 'break-all';
        pre.textContent = JSON.stringify(log, null, 2);
        entryDiv.appendChild(pre); return entryDiv;
    }
    const entryDiv = document.createElement('div');
    entryDiv.className = 'log list-group-item nx-log-entry p-3 border-b border-gray-200 body.dark:border-gray-700 flex justify-between items-center text-sm';
    const statusColors = { allowed: 'limegreen', blocked: 'orangered', default: 'transparent' };
    entryDiv.style.borderLeft = `4px solid ${statusColors[log.status] || statusColors.default}`;
    if (log.device) { entryDiv.dataset.nxDeviceId = log.device.id; entryDiv.dataset.nxDeviceName = log.device.name; }
    if (log.clientIp) entryDiv.dataset.nxClientIp = log.clientIp;
    const leftSide = document.createElement('div'); leftSide.className = 'flex items-center space-x-2 truncate';
    leftSide.appendChild(this.createFaviconElement(log.domain));
    leftSide.appendChild(this.createDomainNameElement(log.domain, log.root));
    if (log.dnssec) leftSide.appendChild(this.createDnssecElement());
    if (log.type) leftSide.appendChild(this.createQueryTypeElement(log.type));
    if (log.status !== 'default' && log.reasons) leftSide.appendChild(this.createBlockReasonElement(log.status, log.reasons, log.matched, entryDiv.style.borderLeftColor));
    entryDiv.appendChild(leftSide);
    const actionsPart = document.createElement('div');
    actionsPart.className = 'nx-action-buttons ml-auto px-4 flex items-center space-x-2'; actionsPart.style.visibility = 'hidden';
    const allowBtn = this.createActionButton('Allow', 'nx-allow-btn bg-green-500 hover:bg-green-600', log.domain);
    const denyBtn = this.createActionButton('Deny', 'nx-deny-btn bg-red-500 hover:bg-red-600', log.domain);
    const hideBtn = this.createActionButton('Hide', 'nx-hide-btn bg-gray-400 hover:bg-gray-500 body.dark:bg-gray-600 body.dark:hover:bg-gray-500', log.domain);
    if (log.status !== 'allowed') actionsPart.appendChild(allowBtn);
    if (log.status !== 'blocked') actionsPart.appendChild(denyBtn);
    actionsPart.appendChild(hideBtn); entryDiv.appendChild(actionsPart);
    const rightSide = document.createElement('div');
    rightSide.className = 'flex flex-col items-end text-xs text-gray-500 body.dark:text-gray-400 space-y-1 min-w-[200px] text-right';
    rightSide.appendChild(this.createDeviceInfoElement(log.device, log.clientIp, log.protocol, log.encrypted));
    rightSide.appendChild(this.createTimestampElement(log.timestamp)); entryDiv.appendChild(rightSide);
    return entryDiv;
  }

  createFaviconElement(domain) {
    const img = document.createElement('img');
    img.className = 'w-4 h-4 mr-1 body.dark:bg-gray-600 body.dark:p-0.5 body.dark:rounded-sm';
    let hexDomain = ''; for (let i = 0; i < domain.length; i++) hexDomain += domain.charCodeAt(i).toString(16);
    img.src = `https://favicons.nextdns.io/hex:${hexDomain}@1x.png`; img.alt = 'favicon';
    img.onerror = () => { img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAxElEQVR42n3RO0vEYBCF4Sfb2iV/QBAW1s52izWQLoKsYMBAilgqfLBk/j9Y5L6FM9XwHuZyhjkKpV6S9EqFXRxUBqFTe/MrDCqHFTdCKwcPbkIIzSyphIsMnHxMOIRqnD1oJ/y0gSEMCkoxNef1ThBKet2y7KOzs6+NoCep9yc5LvhHIi1l0nkGLz5dndQS/d3U46ZXpx+X3OZ1wfm4ZGHYCZoJZ9rxzNGoMdfIXGajZqu3gly7tXp91rd3te7+Wf+++w9XTTyOUFyhzgAAAABJRU5ErkJggg=='; };
    return img;
  }

  createDomainNameElement(fullDomain, rootDomainFromAPI) {
    const domainSpan = document.createElement('span'); domainSpan.className = 'domainName truncate body.dark:text-gray-200';
    const parts = fullDomain.split('.');
    let rootDomain = rootDomainFromAPI || (parts.length > 2 ? parts.slice(-2).join('.') : fullDomain);
    if (parts.length > 2 && SLDs.includes(parts[parts.length - 2])) rootDomain = parts.slice(-3).join('.');
    const subdomainPart = fullDomain.substring(0, fullDomain.length - rootDomain.length);
    const subdomainSpan = document.createElement('span'); subdomainSpan.style.opacity = '0.7'; subdomainSpan.textContent = subdomainPart;
    const rootSpan = document.createElement('span'); rootSpan.textContent = rootDomain;
    domainSpan.appendChild(subdomainSpan); domainSpan.appendChild(rootSpan); domainSpan.title = fullDomain;
    return domainSpan;
  }

  createDnssecElement() {
    const dnssecImg = document.createElement('img');
    dnssecImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAMCAYAAABbayygAAAAgklEQVQYlWP4jwSm7Lr736H10H+H1kP/fXqO/l998glcjgHGmLzrzn+H1kP/vXuO/s9ffPG/d8/R/w6th/4fvvkGVSFM0efvv////////+0XX/47tB76n7/4IkLh+QcfUASRNTu0HiJR4fxDD+AC+DBD/uKLw0fh9osv/ucvvkgQAwBXBF9KK3QiTQAAAABJRU5ErkJggg==';
    dnssecImg.alt = 'DNSSEC'; dnssecImg.title = 'Validated with DNSSEC'; dnssecImg.className = 'w-2.5 h-3 body.dark:filter body.dark:invert';
    return dnssecImg;
  }

  createQueryTypeElement(type) {
    const typeSpan = document.createElement('span');
    typeSpan.className = 'px-1.5 py-0.5 bg-gray-200 body.dark:bg-gray-600 body.dark:text-gray-300 rounded text-xs font-semibold';
    typeSpan.textContent = type; return typeSpan;
  }

  createBlockReasonElement(status, reasons, matchedCname, borderColor) {
    const reasonContainer = document.createElement('div'); reasonContainer.className = 'tooltipParent flex items-center';
    const icon = document.createElement('div'); icon.textContent = 'i';
    icon.style.cssText = `display:inline-block;border-radius:50%;width:14px;height:14px;text-align:center;color:white;font-weight:bold;font-family:serif;font-size:10px;user-select:none;line-height:14px;background-color:${borderColor};`;
    reasonContainer.appendChild(icon);
    const tooltipContent = document.createElement('div');
    if (matchedCname) { const cEl = document.createElement('div'); cEl.innerHTML = `Blocked CNAME: <b class="body.dark:text-gray-200">${matchedCname}</b>`; tooltipContent.appendChild(cEl); }
    const rText = (status === "allowed" ? "Allowed" : "Blocked") + " by: " + reasons.map(r => r.name).join(", ");
    const rEl = document.createElement('div'); rEl.textContent = rText; tooltipContent.appendChild(rEl);
    reasonContainer.createStylizedTooltip(tooltipContent); return reasonContainer;
  }

  createActionButton(text, className, domain) {
    const button = document.createElement('button'); button.textContent = text;
    button.className = `text-xs text-white py-1 px-2 rounded ${className}`; button.dataset.domain = domain;
    if (text === 'Hide') button.addEventListener('click', (e) => this.handleLogDomainAction(e, 'hide', domain));
    return button;
  }

  createDeviceInfoElement(device, clientIp, protocol, encrypted) {
    const container = document.createElement('div'); container.className = 'flex items-center justify-end space-x-1';
    if (encrypted || protocol) {
        const pImg = document.createElement('img');
        pImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAALCAYAAABGbhwYAAAAdUlEQVQYlcXPIQ7EMBADwLzWeP8QuqGm+UNC09csDQ51ybVqTjqp7CyZWCOtNumTtZaO4xBJ9d4159Qz6UI5ZwG4a2aKiB221gRAtVZFhMYYAiCSO3R3AdhOfW/vIUmZmQColHL32kgqIpSeD/wqyXfQ3f8JT3fXMJ8Ei4pHAAAAAElFTkSuQmCC';
        pImg.alt = protocol || 'Encrypted'; pImg.title = protocol || (encrypted ? 'Encrypted' : '');
        pImg.className = 'w-2 h-2.5 body.dark:filter body.dark:invert'; container.appendChild(pImg);
    }
    const dnSpan = document.createElement('span'); dnSpan.className = 'truncate max-w-[100px]';
    if (device && device.name && device.name !== '__UNIDENTIFIED__') {
        dnSpan.textContent = decodeURIComponent(device.name); if (clientIp) dnSpan.title = clientIp;
    } else if (clientIp) dnSpan.textContent = clientIp;
    else if (device && device.name === '__UNIDENTIFIED__') { dnSpan.textContent = 'Unidentified Device'; dnSpan.style.opacity = '0.7'; }
    else dnSpan.innerHTML = '&nbsp;';
    container.appendChild(dnSpan); return container;
  }

  createTimestampElement(isoTimestamp) {
    const timeSpan = document.createElement('span'); timeSpan.className = 'nx-timestamp';
    timeSpan.dataset.timestamp = isoTimestamp;
    timeSpan.textContent = this.formatDisplayTimestamp(isoTimestamp);
    timeSpan.title = new Date(isoTimestamp).toLocaleString();
    return timeSpan;
  }

  startLogsTimestampUpdater() {
    this.clearLogsTimestampUpdater();
    this.logsTimestampUpdaterIntervalId = this.addPageSpecificInterval(() => {
        const tsElements = document.querySelectorAll('.nx-timestamp');
        if (tsElements.length === 0 && this.logsTimestampUpdaterIntervalId) return;
        tsElements.forEach(el => { const iso = el.dataset.timestamp; if (iso) el.textContent = this.formatDisplayTimestamp(iso); });
    }, 20000);
    console.log('NXEnhanced: Logs timestamp updater started.');
  }

  clearLogsTimestampUpdater() {
    if (this.logsTimestampUpdaterIntervalId) {
      this.originalClearInterval(this.logsTimestampUpdaterIntervalId);
      this.intervals = this.intervals.filter(id => id !== this.logsTimestampUpdaterIntervalId);
      this.pageSpecificIntervals = this.pageSpecificIntervals.filter(id => id !== this.logsTimestampUpdaterIntervalId);
      this.logsTimestampUpdaterIntervalId = null; console.log('NXEnhanced: Logs timestamp updater cleared.');
    }
  }

  formatDisplayTimestamp(isoTimestamp) {
    const date = new Date(isoTimestamp); const now = new Date();
    const diffS = Math.round((now - date) / 1000);
    if (diffS < 10) return "just now"; if (diffS < 60) return `${diffS}s ago`;
    if (diffS < 3600) return `${Math.floor(diffS / 60)}m ago`; if (diffS < 86400) return `${Math.floor(diffS / 3600)}h ago`;
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (date.getFullYear()===y.getFullYear() && date.getMonth()===y.getMonth() && date.getDate()===y.getDate()) return `Yesterday ${date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
    return date.toLocaleDateString([],{month:'short',day:'numeric'})+' '+date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  }

  async fetchDevices() {
    if (!this.configId && !this.nextdnsApiToken) console.warn('NXEnhanced: Cannot fetch devices without Config ID or API Token.');
    try {
      const response = await this.makeApiRequest('GET', `analytics/devices?from=-3M`);
      return response.data || [];
    } catch (error) { this.showNotification(`Error fetching devices: ${error.message}`, 'error'); console.error('NXEnhanced: Error fetching devices:', error); return []; }
  }

  async injectDeviceFilterDropdown() {
    let logsTb = document.querySelector('.page-header .row > div:first-child');
    if (!logsTb) { const logsLC = document.querySelector('.list-group.Logs-logs'); if (logsLC && logsLC.parentElement) logsTb = logsLC.parentElement; else { console.warn('NXEnhanced: Logs page toolbar/header not found for device filter injection.'); return; }}
    if (logsTb.querySelector('.nx-device-filter-container')) return;
    const devices = await this.fetchDevices();
    if (!devices.length) console.log('NXEnhanced: No devices found to populate filter.');
    const fCont = document.createElement('div'); fCont.className = 'nx-device-filter-container ml-2 my-2';
    const lbl = document.createElement('label'); lbl.htmlFor = 'nx-device-filter-select'; lbl.textContent = 'Device:'; lbl.className = 'mr-2 text-sm font-medium text-gray-700 body.dark:text-gray-300';
    const sel = document.createElement('select'); sel.id = 'nx-device-filter-select'; sel.className = 'nx-device-filter-select p-2 border border-gray-300 rounded-md text-sm body.dark:bg-gray-700 body.dark:border-gray-600 body.dark:text-gray-200';
    const defOpt = document.createElement('option'); defOpt.value = ''; defOpt.textContent = 'All Devices'; sel.appendChild(defOpt);
    let hasUnid = false; devices.forEach(d => { if (d.id === '__UNIDENTIFIED__') { hasUnid = true; return; } const opt = document.createElement('option'); opt.value = d.id; opt.textContent = d.name || d.id; sel.appendChild(opt); });
    const oDevOpt = document.createElement('option'); oDevOpt.value = '__UNIDENTIFIED__'; oDevOpt.textContent = 'Other Devices (Unidentified)'; sel.appendChild(oDevOpt);
    sel.addEventListener('change', async (e) => { this.currentDeviceFilter = e.target.value; this.currentLogParams.device_id = this.currentDeviceFilter || undefined; await this.refreshLogs(); });
    fCont.appendChild(lbl); fCont.appendChild(sel);
    if (logsTb.firstChild && logsTb !== (document.querySelector('.list-group.Logs-logs')?.parentElement)) logsTb.insertBefore(fCont, logsTb.firstChild); else logsTb.appendChild(fCont);
    if (this.currentDeviceFilter) sel.value = this.currentDeviceFilter;
  }

  filterDisplayedLogsByDevice() {
    const logEntries = document.querySelectorAll('.log.list-group-item');
    logEntries.forEach(entry => {
        const entryDeviceId = entry.dataset.nxDeviceId; const entryDeviceName = entry.dataset.nxDeviceName;
        let matches = false;
        if (!this.currentDeviceFilter || this.currentDeviceFilter === '') matches = true;
        else if (this.currentDeviceFilter === '__UNIDENTIFIED__') matches = (entryDeviceId === '__UNIDENTIFIED__') || (!entryDeviceId && !entryDeviceName);
        else matches = (entryDeviceId === this.currentDeviceFilter);
        entry.style.display = matches ? '' : 'none';
    });
    if (logEntries.length === 0 && this.isLogsPage()) console.warn("NXEnhanced: No log entries found on the page to filter by device client-side.");
  }

  injectListQueriesBeforeUI() {
    let logsTb = document.querySelector('.page-header .row > div:first-child');
    if (!logsTb) { const logsLC = document.querySelector('.list-group.Logs-logs'); if (logsLC && logsLC.parentElement) logsTb = logsLC.parentElement; else { console.warn('NXEnhanced: Logs page toolbar/header not found for "List queries before" UI.'); return; }}
    if (logsTb.querySelector('.nx-list-before-container')) return;
    const cont = document.createElement('div'); cont.className = 'nx-list-before-container ml-4 my-2 flex items-center space-x-2';
    const lbl = document.createElement('label'); lbl.htmlFor = 'nx-list-before-input'; lbl.textContent = 'List queries before:'; lbl.className = 'text-sm font-medium text-gray-700 body.dark:text-gray-300';
    const inp = document.createElement('input'); inp.type = 'datetime-local'; inp.id = 'nx-list-before-input'; inp.className = 'p-2 border border-gray-300 rounded-md text-sm body.dark:bg-gray-700 body.dark:border-gray-600 body.dark:text-gray-200';
    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); now.setSeconds(null); now.setMilliseconds(null); inp.value = now.toISOString().slice(0,16);
    inp.addEventListener('change', () => { this.listBeforeTimestampChanged = (inp.value !== ''); });
    const goBtn = document.createElement('button'); goBtn.textContent = 'Go'; goBtn.className = 'nx-list-before-go btn btn-primary text-xs py-1 px-3';
    const hGo = async () => { this.listBeforeTimestampChanged = (inp.value !== ''); if (inp.value && this.listBeforeTimestampChanged) { const ts = new Date(inp.value).getTime(); this.currentBeforeTimestamp = ts; this.currentLogParams.before = new Date(ts).toISOString(); this.showNotification(`Fetching logs before ${new Date(ts).toLocaleString()}`, 'info'); } else { this.currentBeforeTimestamp = null; delete this.currentLogParams.before; this.showNotification('Displaying latest logs.', 'info'); } await this.refreshLogs(); };
    goBtn.addEventListener('click', hGo); inp.addEventListener('keyup', (e) => { if (e.key === 'Enter') hGo(); });
    cont.appendChild(lbl); cont.appendChild(inp); cont.appendChild(goBtn);
    logsTb.appendChild(cont);
  }

  injectDomainFiltersUI() {
    let logsTb = document.querySelector('.page-header .row > div:first-child');
    if (!logsTb) { const logsLC = document.querySelector('.list-group.Logs-logs'); if (logsLC && logsLC.parentElement) logsTb = logsLC.parentElement; else { console.warn('NXEnhanced: Logs page toolbar/header not found for Domain Filters UI.'); return; }}
    if (logsTb.querySelector('.nx-domain-filters-container')) return;
    const uiCont = document.createElement('div'); uiCont.className = 'nx-domain-filters-container ml-4 my-2';
    const fBtn = document.createElement('button'); fBtn.id = 'nx-filters-toggle-btn'; fBtn.textContent = 'Filters'; fBtn.className = 'btn btn-secondary text-xs py-1 px-3';
    const optsCont = document.createElement('div'); optsCont.id = 'nx-domain-filters-options'; optsCont.className = 'mt-2 p-3 border border-gray-300 rounded-md bg-white body.dark:bg-gray-700 body.dark:border-gray-600 shadow-md'; optsCont.style.display = 'none'; optsCont.style.width = '320px';
    const enFltSw = this.createSwitchCheckbox('Enable Domain Filtering', 'nx-enable-domain-filtering-switch', this.NXsettings?.LogsPage?.DomainsFilteringEnabled ?? true);
    enFltSw.querySelector('input').addEventListener('change', async (e) => { this.NXsettings.LogsPage.DomainsFilteringEnabled = e.target.checked; await this.saveSettings(); this.applyDomainFilters(); this.showNotification(`Domain filtering ${e.target.checked ? 'enabled' : 'disabled'}.`); });
    optsCont.appendChild(enFltSw);
    const taLbl = document.createElement('label'); taLbl.htmlFor = 'nx-domains-to-hide-input'; taLbl.textContent = 'Domains to Hide (one per line):'; taLbl.className = 'block text-sm font-medium text-gray-700 body.dark:text-gray-300 mt-3 mb-1'; optsCont.appendChild(taLbl);
    const domTa = document.createElement('textarea'); domTa.id = 'nx-domains-to-hide-input'; domTa.className = 'w-full p-2 border border-gray-300 rounded-md text-sm body.dark:bg-gray-600 body.dark:border-gray-500 body.dark:text-gray-200'; domTa.rows = 5; domTa.spellcheck = false; domTa.value = (this.NXsettings?.LogsPage?.DomainsToHide || []).join('\n');
    const dbTaSave = this.performanceOptimizer.debounce(async () => { this.NXsettings.LogsPage.DomainsToHide = domTa.value.split('\n').map(d => d.trim()).filter(d => d); await this.saveSettings(); this.applyDomainFilters(); this.showNotification('Hidden domains list updated.'); }, 1000);
    domTa.addEventListener('input', dbTaSave); optsCont.appendChild(domTa);
    fBtn.addEventListener('click', (e) => { e.stopPropagation(); const hid = optsCont.style.display === 'none'; optsCont.style.display = hid ? 'block' : 'none'; fBtn.textContent = hid ? 'Filters (OK)' : 'Filters'; fBtn.classList.toggle('btn-primary', hid); fBtn.classList.toggle('btn-secondary', !hid); });
    uiCont.appendChild(fBtn); uiCont.appendChild(optsCont); logsTb.appendChild(uiCont);
  }

  createSwitchCheckbox(text, id, isChecked = false) {
    const cont = document.createElement("div"); cont.className = "form-check form-switch my-2 flex items-center";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.id = id; cb.className = "form-check-input appearance-none w-9 rounded-full h-5 align-middle bg-gray-300 checked:bg-blue-500 transition duration-200 ease-in-out cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 body.dark:bg-gray-600 body.dark:checked:bg-blue-400"; cb.checked = isChecked; cb.style.position = 'relative';
    const lbl = document.createElement("label"); lbl.textContent = text; lbl.htmlFor = id; lbl.className = "ml-2 text-sm text-gray-700 body.dark:text-gray-300 select-none cursor-pointer";
    cont.appendChild(cb); cont.appendChild(lbl); return cont;
  }

  applyDomainFilters() {
    if (!this.isLogsPage() || !(this.NXsettings?.LogsPage?.DomainsFilteringEnabled)) {
      document.querySelectorAll('.log.list-group-item.nx-hidden-by-domain-filter').forEach(e => { e.style.display = ''; e.classList.remove('nx-hidden-by-domain-filter'); }); return;
    }
    const dToHide = this.NXsettings.LogsPage.DomainsToHide || [];
    if (dToHide.length === 0) { document.querySelectorAll('.log.list-group-item.nx-hidden-by-domain-filter').forEach(e => { e.style.display = ''; e.classList.remove('nx-hidden-by-domain-filter'); }); return; }
    let filtCnt = 0;
    document.querySelectorAll('.log.list-group-item').forEach(entry => {
      const dEl = entry.querySelector('.domainName');
      if (dEl) {
        const dName = dEl.textContent.trim();
        const hide = dToHide.some(hDom => (hDom.startsWith('.') && dName.endsWith(hDom)) || dName === hDom);
        if (hide) { entry.style.display = 'none'; entry.classList.add('nx-hidden-by-domain-filter'); filtCnt++; }
        else { entry.style.display = ''; entry.classList.remove('nx-hidden-by-domain-filter'); }
      }
    });
    console.log(`NXEnhanced: Hid ${filtCnt} entries based on domain filters.`);
  }

  setupLogsPageEventListeners() {
    const logsContP = document.querySelector('#root .container-fluid') || document.body;
    if (this.logActionClickListener && this.lastDelegatedLogActionElement === logsContP) logsContP.removeEventListener('click', this.logActionClickListener);
    else if (this.logActionClickListener && this.lastDelegatedLogActionElement) this.lastDelegatedLogActionElement.removeEventListener('click', this.logActionClickListener);

    this.logActionClickListener = (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        let action = null; let domain = null;
        if (target.classList.contains('nx-allow-btn')) { action = 'allow'; domain = target.dataset.domain; }
        else if (target.classList.contains('nx-deny-btn')) { action = 'deny'; domain = target.dataset.domain; }
        else if (target.classList.contains('nx-hide-btn')) { action = 'hide'; domain = target.dataset.domain; }
        if (action && domain) { event.preventDefault(); event.stopPropagation(); this.showLogActionPopup(action, domain, target); }
    };
    logsContP.addEventListener('click', this.logActionClickListener);
    this.lastDelegatedLogActionElement = logsContP;
  }

  getRootDomain(domain) {
    if (!domain || typeof domain !== 'string') return '';
    const parts = domain.split('.');
    if (parts.length <= 2) return domain;
    const sldCandidate = parts[parts.length - 2];
    if (SLDs.includes(sldCandidate) && parts.length > 2) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  }

  showLogActionPopup(action, domain, eventTarget) {
    this.removeLogActionPopup();
    const rootDomain = this.getRootDomain(domain);
    const isRootSameAsFull = (rootDomain === domain);
    const popup = document.createElement('div'); popup.id = 'nx-action-popup';
    popup.className = 'nx-action-popup'; // Use class for base styles from addGlobalStyles
    Object.assign(popup.style, { top: '0px', left: '0px', visibility: 'hidden' }); // Initial position for size calculation

    const titleText = `${action.charAt(0).toUpperCase() + action.slice(1)} Domain`;
    popup.innerHTML = `
        <h3 style="margin-top:0; margin-bottom:10px; font-size: 1.1em; font-weight: bold;" class="body.dark:text-gray-100">${titleText}</h3>
        <div id="nx-action-popup-msg" style="min-height: 20px; margin-bottom: 10px; color: red;" class="text-xs body.dark:text-red-400"></div>
        <label style="display:block; margin-bottom:5px;" class="text-sm body.dark:text-gray-300">Domain:
            <input type="text" id="nx-action-popup-domain-input" value="${domain}" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:4px; margin-top:3px;" class="body.dark:bg-gray-600 body.dark:border-gray-500 body.dark:text-gray-200 text-sm">
        </label>
        <div style="margin-top:15px; display:flex; justify-content: flex-end; gap:10px;">
            <button id="nx-action-popup-confirm-full" class="btn btn-primary text-sm">Apply to Full: ${domain}</button>
            ${!isRootSameAsFull ? `<button id="nx-action-popup-confirm-root" class="btn btn-secondary text-sm">Apply to Root: *.${rootDomain}</button>` : ''}
            <button id="nx-action-popup-cancel" class="btn btn-light text-sm body.dark:bg-gray-500 body.dark:text-white">Cancel</button>
        </div>
    `;
    document.body.appendChild(popup); this.logActionPopupElement = popup;
    const rect = eventTarget.getBoundingClientRect();
    popup.style.top = `${Math.min(window.innerHeight - popup.offsetHeight - 10, rect.bottom + window.scrollY + 5)}px`;
    let newLeft = rect.left + window.scrollX - (popup.offsetWidth / 2) + (rect.width / 2);
    newLeft = Math.max(10, newLeft); // Ensure not too far left
    newLeft = Math.min(newLeft, window.innerWidth - popup.offsetWidth - 10); // Ensure not too far right
    popup.style.left = `${newLeft}px`;
    popup.style.visibility = 'visible';

    const domainInput = popup.querySelector('#nx-action-popup-domain-input');
    const msgEl = popup.querySelector('#nx-action-popup-msg');
    const confirmFullBtn = popup.querySelector('#nx-action-popup-confirm-full');
    const confirmRootBtn = popup.querySelector('#nx-action-popup-confirm-root');
    const cancelBtn = popup.querySelector('#nx-action-popup-cancel');

    const makeButtonsPending = (pending) => {
        confirmFullBtn.disabled = pending;
        if(confirmRootBtn) confirmRootBtn.disabled = pending;
        cancelBtn.disabled = pending;
        msgEl.textContent = pending ? 'Processing...' : '';
    };

    confirmFullBtn.addEventListener('click', async () => {
        const currentDomainValue = domainInput.value.trim();
        if (!currentDomainValue) { msgEl.textContent = "Domain cannot be empty."; return; }
        makeButtonsPending(true);
        await this.handleLogDomainAction(null, action, currentDomainValue, {popup, messageElement: msgEl, makeButtonsPending});
    });
    if (confirmRootBtn) {
        confirmRootBtn.addEventListener('click', async () => {
            makeButtonsPending(true);
            await this.handleLogDomainAction(null, action, rootDomain, {popup, messageElement: msgEl, makeButtonsPending});
        });
    }
    cancelBtn.addEventListener('click', () => this.removeLogActionPopup());
    this.popupEscapeListener = (e) => { if (e.key === 'Escape') this.removeLogActionPopup(); };
    document.addEventListener('keydown', this.popupEscapeListener);
    this.popupOutsideClickListener = (e) => { if (this.logActionPopupElement && !this.logActionPopupElement.contains(e.target) && e.target !== eventTarget && !eventTarget.contains(e.target)) this.removeLogActionPopup(); };
    setTimeout(() => document.addEventListener('click', this.popupOutsideClickListener), 0);
    domainInput.focus(); domainInput.select();
  }

  removeLogActionPopup() {
    if (this.logActionPopupElement) { this.logActionPopupElement.remove(); this.logActionPopupElement = null; }
    if (this.popupEscapeListener) document.removeEventListener('keydown', this.popupEscapeListener);
    if (this.popupOutsideClickListener) document.removeEventListener('click', this.popupOutsideClickListener);
  }

  async handleLogDomainAction(event, action, domain, popupContext = null) {
    if (event) event.preventDefault();
    const messageEl = popupContext ? popupContext.messageElement : null;
    const makeButtonsPending = popupContext ? popupContext.makeButtonsPending : () => {};

    if (!domain) {
      if (messageEl) messageEl.textContent = 'Domain not specified.'; else this.showNotification('Domain not specified.', 'error');
      if (popupContext) makeButtonsPending(false);
      return;
    }

    if (action === 'hide') {
        if (!this.NXsettings.LogsPage.DomainsToHide.includes(domain)) {
            this.NXsettings.LogsPage.DomainsToHide.push(domain);
            await this.saveSettings(); this.applyDomainFilters();
            if (messageEl) messageEl.textContent = `${domain} added to hide list.`; else this.showNotification(`${domain} added to hide list. Re-filtering logs.`, 'success');
        } else {
            if (messageEl) messageEl.textContent = `${domain} is already in the hide list.`; else this.showNotification(`${domain} is already in the hide list.`, 'info');
        }
        if (popupContext) setTimeout(() => this.removeLogActionPopup(), 1500); else if (messageEl) makeButtonsPending(false);
        return;
    }

    const listName = action === 'allow' ? 'allowlist' : 'denylist';
    if (!messageEl) this.showNotification(`Processing ${action} for ${domain}...`, 'info', 1500);

    try {
      await this.makeApiRequest('POST', `${listName}`, { id: domain, active: true });
      if (messageEl) messageEl.textContent = `${domain} ${action}ed successfully.`; else this.showNotification(`${domain} ${action}ed successfully.`, 'success');
      if (popupContext) setTimeout(() => this.removeLogActionPopup(), 1500);
    } catch (error) {
      console.error(`NXEnhanced: Failed to ${action} ${domain}:`, error);
      if (messageEl) messageEl.textContent = `Error: ${error.message}`; else this.showNotification(`Error ${action}ing ${domain}: ${error.message}`, 'error');
    } finally {
        if (popupContext) makeButtonsPending(false);
    }
  }

  async makeApiRequest(method, endpoint, body = null, isRetry = false) {
    // Use this.configId and this.nextdnsApiToken loaded during init
    if (!this.configId && !endpoint.startsWith('/users/me') && !endpoint.startsWith('profiles')) {
        const isCoreEndpoint = ['allowlist', 'denylist', 'logs'].some(e => endpoint.includes(e));
        if (isCoreEndpoint) {
            this.showNotification('Configuration ID is missing. Cannot make API request.', 'error');
            console.error('NXEnhanced: Configuration ID is missing for API request.');
            throw new Error('Configuration ID is missing.');
        }
    }

    let requestURL = "https://api.nextdns.io";
    // Construct URL carefully based on whether endpoint is profile-specific
    if (this.configId && !endpoint.startsWith('/profiles/') && !endpoint.startsWith('/users/me') && !endpoint.startsWith('profiles')) {
        requestURL += `/profiles/${this.configId}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
    } else {
        requestURL += endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    }

    const options = {
      method: method,
      headers: {},
    };

    if (this.nextdnsApiToken) {
        options.headers['X-Api-Key'] = this.nextdnsApiToken;
    } else {
        // Rely on cookies if no token; this is default browser behavior for fetch if not overridden by credentials policy
        options.credentials = 'include';
        console.warn("NXEnhanced: NextDNS API Token not set. API requests will rely on existing browser session (cookies). This might not work for all operations or in all contexts.");
    }

    if (body) {
      options.headers['Content-Type'] = 'application/json;charset=utf-8';
      options.body = JSON.stringify(body);
    }

    if (!isRetry) console.log(`NXEnhanced: API Request: ${method} ${requestURL}`, body || '');

    try {
      const response = await fetch(requestURL, options);
      const responseText = await response.text();

      if ((responseText.includes("Too Many Requests") || response.status === 429) && !isRetry) {
        console.warn(`NXEnhanced: API rate limit hit for ${requestURL}. Retrying in 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.makeApiRequest(method, endpoint, body, true); // Single retry
      }

      let responseData;
      try {
          responseData = responseText ? JSON.parse(responseText) : {}; // Handle empty response
      } catch (e) {
          if (response.ok && responseText.trim() === '') return {};
          console.error(`NXEnhanced: API response for ${requestURL} was not valid JSON: ${responseText.substring(0,100)}`);
          throw new Error(`API returned non-JSON response: ${response.status} ${response.statusText}`);
      }

      if (!response.ok || (responseData.error || (responseData.errors && responseData.errors.length > 0))) {
          const errorMessage = responseData.error || (responseData.errors ? responseData.errors.map(e => e.message || e.code).join(', ') : `HTTP error ${response.status}`);
          console.error(`NXEnhanced: API Error for ${requestURL}:`, errorMessage, responseData);
          throw new Error(errorMessage);
      }
      return responseData;
    } catch (error) {
      console.error(`NXEnhanced: API Request failed for ${requestURL}:`, error.message);
      if (!isRetry && (error.name === 'AbortError' || error.message.toLowerCase().includes('networkerror'))) {
          console.warn(`NXEnhanced: Network error for ${requestURL}. Retrying in 5s...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          return this.makeApiRequest(method, endpoint, body, true); // Single retry for network issues
      }
      // For "fatigue" or other errors after retry, we might want to inform the user more directly
      if (isRetry) alert(`Failed to communicate with NextDNS server after multiple attempts: ${error.message}`);
      throw error;
    }
  }

  getConfigIdFromUrl() {
    const hrefParts = location.href.split("/");
    if (hrefParts.length >= 4 && hrefParts[3] && hrefParts[3].length > 5 && !['settings', 'privacy', 'security', 'parentalcontrol', 'logs', 'setup', 'account', 'billing', 'referrals', 'profile'].includes(hrefParts[3].toLowerCase())) {
        return hrefParts[3];
    }
    return null;
  }

  showNotification(message, type = 'success', duration = 3000) {
    const notificationId = 'nx-notification-element';
    let notificationElement = document.getElementById(notificationId);

    if (!notificationElement) {
      notificationElement = document.createElement('div');
      notificationElement.id = notificationId;
      // Class will be 'nx-notification'
      document.body.appendChild(notificationElement);
    }

    // Set base class first, then type-specific class
    notificationElement.className = 'nx-notification';
    notificationElement.classList.add(type);
    notificationElement.textContent = message;

    void notificationElement.offsetWidth;
    notificationElement.classList.add('show');

    if (notificationElement.timer) {
      clearTimeout(notificationElement.timer);
    }

    notificationElement.timer = setTimeout(() => {
      notificationElement.classList.remove('show');
    }, duration);
  }
}

// Initialize the content script
// Ensure only one instance of NXEnhancedContent runs
if (document.documentElement.dataset.nxEnhancedInitialized === 'true') {
    console.warn('NXEnhanced: Content script already initialized. Skipping re-initialization.');
} else {
    document.documentElement.dataset.nxEnhancedInitialized = 'true';
    const nxInstance = new NXEnhancedContent();
    // window.nxEnhancedContentInstance = nxInstance; // Optional: for debugging
}

[end of src/content.js]

[end of src/content.js]

[end of src/content.js]
