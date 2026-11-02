/**
 * DataLens Background Service Worker
 * Manages extension lifecycle, side panel behavior, and cross-tab communication.
 */

// Enable automatic opening of side panel when user clicks the extension action icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: unknown) => console.error('[DataLens] Failed to set side panel behavior:', error));

chrome.runtime.onInstalled.addListener(() => {
  console.log('[DataLens] Extension installed/updated successfully');

  // Ensure sidePanel behavior is set on install
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error('[DataLens] onInstalled panel behavior error:', error));
});

// Fallback for Chrome versions or cases where action click needs manual sidePanel opening
chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
  if (tab.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error: unknown) {
      console.warn('[DataLens] Side panel open triggered via action click fallback:', error);
    }
  }
});
