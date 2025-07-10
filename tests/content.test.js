// tests/content.test.js

// JSDOM setup to simulate browser environment for tests
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: "https://my.nextdns.io/123456/logs" });
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.MutationObserver = dom.window.MutationObserver; // Required by NXEnhancedContent constructor related logic
global.IntersectionObserver = class { // Basic mock for IntersectionObserver
    constructor(callback, options) { this.callback = callback; this.options = options; }
    observe(target) {}
    unobserve(target) {}
    disconnect() {}
};
global.requestIdleCallback = (callback, options) => { // Basic mock for requestIdleCallback
    const start = Date.now();
    return setTimeout(() => {
        callback({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        });
    }, 1); // Execute almost immediately for test purposes
};


// Mock NXStorage before importing NXEnhancedContent
jest.mock('../src/storage.js', () => ({
  __esModule: true, // This is important for ES modules
  default: class NXStorage {
    static async get(key) {
      if (key === 'NXsettings') return { LogsPage: { ShowCounters: true, DomainsToHide: [], DomainsFilteringEnabled: false } }; // Basic mock settings
      if (key === 'nextdnsApiToken') return 'test-api-token';
      if (key === 'geminiApiKey') return 'test-gemini-key';
      if (key === 'nextdnsConfigId') return '123456';
      return null;
    }
    static async set(key, value) {}
    static async getMultiple(keys) { return {}; }
    static async remove(keyOrKeys) {}
    static async clearAll() {}
    static onChanged(callback) {}
  },
}));

// Mock PerformanceOptimizer
jest.mock('../src/performance.js', () => ({
    __esModule: true,
    default: class PerformanceOptimizer {
        debounce(fn, delay) { return fn; } // No-op debounce for tests
        throttle(fn, delay) { return fn; }   // No-op throttle for tests
        observeElements(selector, callback, options) { /* no-op */ }
    }
}));


// Import the class to be tested AFTER mocks are set up
// Assuming NXEnhancedContent is the default export from content.ts (after TS compilation to JS)
// We need to point to the compiled JS file if running this test directly with Node/Jest without TS transpilation.
// For now, assuming Jest is configured to handle .ts files (e.g., via babel-jest or ts-jest)
const NXEnhancedContent = require('../src/content.ts').default;


describe('NXEnhancedContent - Logs Page', () => {
  let nxContentInstance;

  beforeEach(() => {
    // Reset JSDOM body and create a fresh instance for each test
    document.body.innerHTML = `
      <div id="root">
        <div class="main-content">
          </div>
      </div>
      <div id="logs-header"></div>
      <table id="logs-table">
        <thead>
          <tr><th>Status</th><th>Domain</th><th>Device</th><th>Time</th><th>Actions</th></tr>
        </thead>
        <tbody></tbody>
        <tfoot></tfoot>
      </table>
    `;
    // Create a new instance of NXEnhancedContent before each test
    // This ensures that any internal state from previous tests doesn't interfere.
    nxContentInstance = new NXEnhancedContent();
    // Manually call init functions if constructor doesn't fully set up for tests
    // await nxContentInstance.loadSettings(); // Already called by constructor usually.
    // nxContentInstance.ensureLogsTableStructure(); // Ensure table is there
  });

  afterEach(() => {
    // Clean up intervals or observers if necessary, though instance is fresh each time
    if (nxContentInstance && typeof nxContentInstance.clearPageSpecificIntervals === 'function') {
        nxContentInstance.clearPageSpecificIntervals();
    }
    if (nxContentInstance && nxContentInstance.observer && typeof nxContentInstance.observer.disconnect === 'function') {
        nxContentInstance.observer.disconnect();
    }
    if (nxContentInstance && nxContentInstance.logsInfiniteScrollObserver && typeof nxContentInstance.logsInfiniteScrollObserver.disconnect === 'function') {
        nxContentInstance.logsInfiniteScrollObserver.disconnect();
    }
     if (nxContentInstance && nxContentInstance.logStreamWebsocket && typeof nxContentInstance.logStreamWebsocket.close === 'function') {
        nxContentInstance.logStreamWebsocket.close();
    }
    document.body.innerHTML = ''; // Clear DOM
    jest.clearAllMocks(); // Clear any jest mocks
  });

  test('appendLogs should add rows to the logs table', (done) => {
    // nxContentInstance.ensureLogsTableStructure(); // Make sure table exists

    const logsToAppend = [
      { domain: 'example.com', status: 'blocked', device: 'device1', timestamp: Date.now(), reason: 'Blocklist X' },
      { domain: 'test.org', status: 'allowed', device: 'device2', timestamp: Date.now() - 100000 },
    ];

    nxContentInstance.appendLogs(logsToAppend);

    // Since appendLogs uses requestIdleCallback, we need to wait for it to execute.
    // setTimeout is a common way to wait for the next tick or a short period.
    setTimeout(() => {
        const rows = document.querySelectorAll('#logs-table tbody tr');
        expect(rows.length).toBe(logsToAppend.length);

        const firstRowCells = rows[0].querySelectorAll('td');
        // Example check: Domain of the first appended log. createLogEntryElement nests domain info.
        // This depends heavily on the exact DOM structure created by createLogEntryElement.
        // Let's assume the domain is identifiable, e.g., in a cell with class 'domain-column'.
        const firstDomainCell = rows[0].querySelector('.domain-column .domainName');
        expect(firstDomainCell).not.toBeNull();
        expect(firstDomainCell.textContent).toContain('example.com');
        expect(rows[0].querySelector('.status-column').dataset.status).toBe('blocked');

        const secondDomainCell = rows[1].querySelector('.domain-column .domainName');
        expect(secondDomainCell).not.toBeNull();
        expect(secondDomainCell.textContent).toContain('test.org');
        expect(rows[1].querySelector('.status-column').dataset.status).toBe('allowed');
        done(); // Indicate test completion for async operations
    }, 100); // Wait a bit longer than the requestIdleCallback mock's timeout
  });

  // Add more tests here:
  // - Test updateLogCounters correctly counts and displays.
  // - Test filtering logic (applyDomainFilters).
  // - Test WebSocket message handling (mock WebSocket and its onmessage).
  // - Test Allow/Deny/Hide popup logic (showActionPopup and its interactions).
});
