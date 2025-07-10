# NXEnhanced: Your Advanced Interface for NextDNS

NXEnhanced is a browser extension designed to augment the NextDNS website, offering a suite of advanced features and quality-of-life improvements for a more powerful and user-friendly experience. Manage your network security and privacy settings with enhanced controls, streamlined workflows, and AI-powered insights.

This README primarily focuses on the **WebExtension version** of NXEnhanced. A separate Userscript version by BLBC (hjk789) also exists and may have a different feature set and development cycle. For the Userscript, please refer to its [homepage on GitHub](https://github.com/hjk789/NXEnhanced) or [GreasyFork page](https://greasyfork.org/en/scripts/408934-nx-enhanced).

## Current Status

NXEnhanced (this WebExtension version, formerly referred to as NXEnhanced2025 in some development discussions) is currently in active development (Pre-release). Links to the Chrome Web Store, Firefox Add-ons, and GitHub Releases will be updated here once the project is officially published. Please check this repository or follow announcements from the development team for further details.

## Key Features (WebExtension)

NXEnhanced supercharges your NextDNS dashboard with the following capabilities:

**Enhanced Logs Page:**
*   **Advanced Infinite Scroll**: Seamlessly load logs as you scroll, with improved performance, clear loading status, and robust error handling.
*   **Intelligent Action Popup**: Quickly allow, deny, or hide domains directly from the logs. Includes options to apply actions to the specific subdomain or the entire root domain, with a history of your actions saved.
*   **Real-time Log Counters**: Instantly see counts of total visible, blocked, and allowed queries, updating dynamically as you filter or new logs arrive.
*   **Live Log Streaming**: Connect to a real-time stream of your DNS queries directly on the logs page, with new entries appearing at the top. Includes auto-reconnect functionality.
*   **AI-Powered Blocklist Suggestions (Experimental)**: Receive intelligent blocklist suggestions based on your recent query patterns, powered by Google's Gemini AI. Requires a Gemini API Key and user-initiated action. (See Usage section for details and privacy considerations).

**Site-Wide Improvements:**
*   **Allowlist/Denylist Search**: Easily find specific domains within your allow and deny lists using a new search bar.
*   **Validated Configuration Import**: Securely import your NextDNS settings from a JSON file, with added validation to ensure correct formatting.
*   **Bulk Actions (Privacy/Security)**: Quickly enable or disable all blocklists (on the Privacy page) or all threat intelligence feeds (on the Security page) with convenient bulk action buttons.
*   **Dark Mode Compatibility**: Styles are designed to work well with NextDNS's native dark mode and include dark mode specific enhancements.
*   **Customizable Domain Hiding**: Fine-tune your logs view by specifying domains or patterns to hide.

**Technical Enhancements:**
*   **TypeScript Codebase**: Improved code quality, maintainability, and developer experience.
*   **Optimized Performance**: Features like `requestIdleCallback` are used for smoother rendering of large data sets.

## Installation

These instructions are for the **NXEnhanced WebExtension**.

There are two main ways to install the extension:

### 1. From Official Stores (Recommended for most users)

*   **Chrome Web Store**: (TODO: Add link once published by the project maintainers)
*   **Firefox Add-ons (AMO)**: (TODO: Add link once published by the project maintainers)
*   **Other Chromium Browsers** (Edge, Opera, Vivaldi, Brave): You can typically install extensions from the Chrome Web Store.

This is the easiest and recommended way to install, as it provides automatic updates.

### 2. From Source (For developers or advanced users)

If you want to install from the source code, use a pre-packaged release `.zip` from GitHub, or if you've made local modifications:

**A. Using a Pre-packaged Release (`.zip` file):**

1.  Go to the project's [Releases page on GitHub](https://github.com/YOUR_USERNAME/YOUR_REPONAME/releases) (TODO: Project maintainers to update this link to the correct repository if releases are published there).
2.  Download the latest `NXEnhanced-WebExtension-vX.X.X.zip` file.
3.  Extract the `.zip` file to a permanent location on your computer.
4.  **For Chrome/Chromium-based browsers:**
    *   Open your browser and navigate to `chrome://extensions`.
    *   Enable "Developer mode" (usually a toggle in the top right).
    *   Click "Load unpacked".
    *   Select the directory where you extracted the extension files (it should be the folder containing `manifest.json` and the `dist` subfolder, typically named `WebExtension` or similar from the zip).
5.  **For Firefox:**
    *   Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
    *   Click "Load Temporary Add-on...".
    *   Open the extracted extension directory and select the `WebExtension/manifest.json` file (or the root `manifest.json` if the zip is structured that way).
    *   *Note: Temporary add-ons in Firefox are removed when you close the browser. For a more permanent sideload, you might need to package it as an XPI and sign it, or use developer/nightly versions of Firefox with specific settings.*

**B. Building and Installing from Local Source Code:**

1.  **Prerequisites**:
    *   Node.js and npm: Download and install from [nodejs.org](https://nodejs.org/).
    *   Git: Download and install from [git-scm.com](https://git-scm.com/).
2.  **Clone the Repository**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPONAME.git # (TODO: Project maintainers to update this link)
    cd YOUR_REPONAME # Or your repository's directory name
    ```
3.  **Install Dependencies**:
    ```bash
    npm install
    ```
4.  **Build the Extension**:
    ```bash
    npm run build
    ```
    This will create the necessary files in the `WebExtension/dist/` directory.
5.  **Load the Unpacked Extension**:
    *   Follow step 4 from "Using a Pre-packaged Release" above, but select the `WebExtension` directory (which contains the `manifest.json` and the newly created `dist` folder).

**Userscript Version:**

For the NXEnhanced Userscript by BLBC (hjk789), please visit its [GreasyFork page](https://greasyfork.org/en/scripts/408934-nx-enhanced) for installation instructions. You will typically need a userscript manager extension like Tampermonkey or Violentmonkey.

## Configuration

To unlock the full potential of NXEnhanced, particularly features that interact with the NextDNS API or other services like Gemini AI, you'll need to configure a few settings. These are typically managed through the extension's **Options page** or **Popup**.

You can usually access the Options page by:
*   Right-clicking the NXEnhanced extension icon in your browser toolbar and selecting "Options".
*   Going to your browser's extensions management page and finding NXEnhanced, then clicking "Details" or "Options". (The `options-page.html` is defined in the manifest).

### Required for Core API Features:

1.  **NextDNS Configuration ID**:
    *   **Purpose**: This tells NXEnhanced which of your NextDNS configurations to interact with (e.g., for fetching logs, applying allow/deny rules).
    *   **How to find it**:
        1.  Go to [my.nextdns.io](https://my.nextdns.io).
        2.  Select the configuration profile you want to use with the extension.
        3.  The Configuration ID is part of the URL. For example, if your URL is `https://my.nextdns.io/1a2b3c/setup`, your Configuration ID is `1a2b3c`.
    *   **Where to set**: Enter this ID in the "NextDNS Configuration ID" field in the extension's options. If you are on a specific configuration's page on the NextDNS site, the extension may also auto-detect it.

2.  **NextDNS API Key** (Optional, but highly recommended for full functionality):
    *   **Purpose**: Allows NXEnhanced to make changes to your NextDNS settings programmatically (e.g., adding a domain to your allowlist/denylist directly from the logs page). While some features might work using your existing browser session, an API key ensures reliability and access to all API-dependent features.
    *   **How to find it**:
        1.  Go to [my.nextdns.io](https://my.nextdns.io).
        2.  Navigate to your "Account" page.
        3.  Scroll down to the "API Keys" section.
        4.  Create a new API key if you don't have one. Give it a descriptive name (e.g., "NXEnhanced").
        5.  Copy the generated API key.
    *   **Where to set**: Paste this key into the "NextDNS API Key" field in the extension's options.

### For AI-Powered Features:

3.  **Gemini API Key** (Optional):
    *   **Purpose**: Required for the "AI Blocklist Suggestions" feature on the Logs page. This key allows NXEnhanced to send parts of your log data (domain names) to Google's Gemini AI for analysis and suggestions.
    *   **How to get it**:
        1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey) (or search for "Google Gemini API Key").
        2.  Sign in with your Google account.
        3.  Create a new API key.
    *   **Where to set**: Paste this key into the "Gemini API Key" field in the extension's options.
    *   **Privacy Note**: Be aware that using this feature involves sending data (domain names from your logs) to a third-party AI service (Google). If you have privacy concerns, do not configure or use this feature.

**Important Notes:**

*   Always keep your API keys secure and do not share them.
*   The extension stores these settings locally in your browser's storage using `chrome.storage.sync` (which may sync across your browser profiles if enabled) with a fallback to `chrome.storage.local`.
*   If you use multiple NextDNS configurations, you might need to update the Configuration ID in the extension's options when switching between them on the NextDNS website, unless the extension successfully auto-detects it from the URL.

## Using NXEnhanced Features

Once installed and configured, NXEnhanced seamlessly integrates its features into the NextDNS website.

### Logs Page (`my.nextdns.io/<config-id>/logs`)

The Logs page receives the most significant enhancements:

*   **Infinite Scroll**: Simply scroll down the page. New logs will automatically load as you approach the bottom. A message at the very bottom of the log table will indicate the loading status ("Loading...", "No more logs", or "Error loading logs").
*   **Action Popup (Allow/Deny/Hide)**:
    *   Hover over any log entry to reveal "Allow", "Deny", and "Hide" buttons.
    *   Clicking "Allow" or "Deny" will open a popup:
        *   **Choose Scope**: Select whether to apply the action to the "Specific domain" (e.g., `sub.example.com`) or the "Root domain" (e.g., `example.com`).
        *   **Confirm**: Click "Confirm" to apply the action. The domain will be added to your NextDNS allowlist/denylist.
    *   Clicking "Hide" will also open a similar popup:
        *   You can choose to hide the specific domain or the root domain.
        *   Confirming will add the domain to NXEnhanced's internal list of domains to hide from the logs view (this does not affect NextDNS blocking, only visibility in the extension).
    *   A history of your Allow/Deny/Hide actions via the popup is stored by the extension.
*   **Log Counters**:
    *   Look for a new section, typically at the top of the logs area (or a fixed counter display), showing:
        *   `Total Visible`: Number of log entries currently visible in the table (respects filters).
        *   `Blocked`: Number of visible log entries that were blocked.
        *   `Allowed`: Number of visible log entries that were allowed.
    *   These counters update automatically as you scroll, filter, or new logs arrive via streaming.
*   **Real-time Log Streaming**:
    *   If enabled and correctly configured (API Key + Config ID), log streaming should start automatically when you visit the Logs page.
    *   New log entries will appear at the top of the table in real-time.
    *   Notifications will indicate connection status ("Log streaming connected", "Log streaming error", "Reconnecting...").
*   **AI-Powered Blocklist Suggestions (Experimental)**:
    *   **How to use**: Access the Logs page (`my.nextdns.io/<config-id>/logs`) and click the "Suggest Blocklists" button (typically located in the upper right area of the logs section - exact placement may vary). The extension will then analyze your recent logs.
    *   **Output**: A notification will appear with blocklist suggestions generated by the Gemini AI model.
    *   **Requires**: You must configure your Gemini API Key in the extension's Options page.
    *   **Privacy Note**: This feature sends domain names from your logs to Google's Gemini API for analysis. If you have privacy concerns, please do not enable or use this feature. You can inspect the data being sent via your browser's developer tools (F12 > Network tab) if you wish to understand the payload.

### Allowlist/Denylist Pages (`my.nextdns.io/<config-id>/allowlist` or `denylist`)

*   **Search/Filter Bar**:
    *   A new search input box will appear at the top of the domain list.
    *   Type any part of a domain name to instantly filter the list and show only matching entries. This is a client-side filter for quick navigation.

### Settings Page (`my.nextdns.io/<config-id>/settings`)

*   **Configuration Import**:
    *   (TODO: Project maintainers to specify how this is triggered - e.g., a new "Import NXEnhanced Config" button or an enhancement to an existing import mechanism. The functionality `importConfig(file)` is present in the code).
    *   When you select a JSON configuration file for import, NXEnhanced will first validate its format (checking for `version` and `settings` fields).
    *   If valid, the settings are applied. If invalid, an error notification is shown.

### Privacy Page (`my.nextdns.io/<config-id>/privacy`)

*   **Bulk Actions for Blocklists**:
    *   New buttons "Enable All Blocklists" and "Disable All Blocklists" will appear, typically above the list of blocklist categories.
    *   Clicking these buttons will attempt to toggle all blocklist switches on the page.
    *   A notification will indicate the action being performed. Please allow some time for all actions to complete.

### Security Page (`my.nextdns.io/<config-id>/security`)

*   **Bulk Actions for Threat Intelligence Feeds**:
    *   Similar to the Privacy page, "Enable All Feeds" and "Disable All Feeds" buttons will appear.
    *   These allow you to quickly toggle all threat intelligence feed switches.

## Development (WebExtension)

If you wish to contribute to the development of the NXEnhanced WebExtension or build it from source:

1.  **Prerequisites**:
    *   Node.js and npm (see Installation section)
    *   Git (see Installation section)
2.  **Clone & Install Dependencies**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPONAME.git # (TODO: Project maintainers to update this link)
    cd YOUR_REPONAME # Or your repository's directory name
    npm install
    ```
3.  **Build Commands**:
    *   **Development Build (with watch mode)**: For active development. This will automatically rebuild the extension when you make changes to the source files.
        ```bash
        npm run dev
        ```
        Load the `WebExtension` directory as an unpacked extension in your browser.
    *   **Production Build**: To create optimized files for packaging or release.
        ```bash
        npm run build
        ```
        The output will be in the `WebExtension/dist/` directory.
4.  **Linting**:
    *   To check for code style issues:
        ```bash
        npm run lint
        ```
5.  **Testing**:
    *   To run unit tests:
        ```bash
        npm test
        ```

## Browser Compatibility

NXEnhanced (WebExtension version) is actively tested and developed for:
- **Google Chrome**: Latest official version.
- **Mozilla Firefox**: Latest official version.

It is expected to work on other Chromium-based browsers (such as Microsoft Edge, Opera, Brave), but these are not part of the primary testing process. Compatibility may vary.

Please [report any browser-specific compatibility issues](https://github.com/YOUR_USERNAME/YOUR_REPONAME/issues) (TODO: Project maintainers to update link) you encounter.

## Known Conflicts

Currently, there are no specifically identified conflicts with other extensions or userscripts. However, potential issues could arise with:

*   **Other NextDNS Modifying Extensions/Userscripts**: If you are using other tools that alter the layout or functionality of the `my.nextdns.io` website, they might interfere with NXEnhanced.
*   **Aggressive Content Blockers**: Some strict content blockers *could* potentially interfere with the injection of UI elements or API calls, though this is generally unlikely for the domains used (`my.nextdns.io`, `api.nextdns.io`, `generativelanguage.googleapis.com`).

**Troubleshooting Conflicts:**
1.  If you suspect a conflict, try temporarily disabling other extensions one by one to identify the culprit.
2.  Check the browser console (F12 > Console) for error messages that might indicate which script or extension is causing a problem.
3.  If you find a reproducible conflict, please report it as an issue on GitHub.

## Troubleshooting

*   **Features not appearing**:
    *   Ensure the extension is enabled in your browser and that you are on the `my.nextdns.io` domain.
    *   Verify your NextDNS Configuration ID is correctly set in the extension's Options page.
    *   **Action**: Open your browser's developer console (usually F12, then select the "Console" tab) and look for any error messages starting with "NXEnhanced:" or related to content scripts.
*   **Allow/Deny/Hide actions not working**:
    *   Ensure your NextDNS API Key is correctly entered in the extension options and has the necessary permissions on the NextDNS website.
    *   Check for error notifications from the extension or more details in the browser console.
*   **AI Suggestions not working**:
    *   Verify your Gemini API Key is correctly entered in the extension's Options page.
    *   Ensure you have a stable internet connection.
    *   **Action**: Check the browser console for error messages. Errors from the Gemini API (e.g., "Quota exceeded," "API key not valid") will often be logged there.
*   **Log Streaming not working or stops**:
    *   Confirm your NextDNS API Key and Configuration ID are correctly set in Options. This feature requires both.
    *   Streaming only works when you are actively on the Logs page (`my.nextdns.io/<config-id>/logs`).
    *   The stream will automatically attempt to reconnect if the connection drops. If it fails repeatedly, check your internet connection and the browser console for WebSocket errors.
*   **Log counters seem incorrect**:
    *   The counters reflect currently *visible* logs after client-side filters (like the "Hide" feature) are applied. They may not match server-side totals if filters are active.
*   **Conflicts with other NextDNS extensions or Userscripts**:
    *   As mentioned in "Known Conflicts," try disabling other tools that modify `my.nextdns.io` to see if this resolves the issue.

If you encounter a persistent bug, please [open an issue on GitHub](https://github.com/YOUR_USERNAME/YOUR_REPONAME/issues) (TODO: Project maintainers to update link) with detailed steps to reproduce the problem, including any relevant console error messages.

## Contributing

Contributions to NXEnhanced are welcome! If you'd like to contribute, please:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes.
4.  Ensure your code lints (`npm run lint`) and tests pass (`npm test`).
5.  Submit a pull request with a clear description of your changes.

(TODO: Project maintainers might consider adding more detailed contributing guidelines in a `CONTRIBUTING.md` file if the project grows.)

## License

NXEnhanced is released under the [MIT License](LICENSE). (TODO: Project maintainers to ensure a `LICENSE` file with the MIT License text exists in the repository root. The Userscript version references a license at https://github.com/hjk789/NXEnhanced#license).
