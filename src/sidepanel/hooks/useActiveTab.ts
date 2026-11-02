import { useState, useEffect, useCallback } from 'react';

export interface ActiveTabInfo {
  id?: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
  isScannable: boolean;
  unscannableReason?: string;
}

export function useActiveTab() {
  const [tabInfo, setTabInfo] = useState<ActiveTabInfo>({
    isScannable: false,
  });
  const [loading, setLoading] = useState(true);

  const evaluateScannability = (url?: string): { isScannable: boolean; reason?: string } => {
    if (!url) {
      return { isScannable: false, reason: 'No active tab URL detected' };
    }
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
      return {
        isScannable: false,
        reason: 'Browser protected system pages cannot be scanned. Navigate to any website.',
      };
    }
    return { isScannable: true };
  };

  const refreshActiveTab = useCallback(async () => {
    try {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        // Fallback for development outside extension
        setTabInfo({
          id: 1,
          title: 'Development Preview Page (Local)',
          url: 'http://localhost:5173/sample-data',
          isScannable: true,
        });
        setLoading(false);
        return;
      }

      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        const { isScannable, reason } = evaluateScannability(activeTab.url);
        setTabInfo({
          id: activeTab.id,
          title: activeTab.title || 'Untitled Webpage',
          url: activeTab.url || '',
          favIconUrl: activeTab.favIconUrl,
          isScannable,
          unscannableReason: reason,
        });
      }
    } catch (err) {
      console.error('[DataLens] Failed to retrieve active tab:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshActiveTab();

    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    // Listen for tab switches
    const handleActivated = () => {
      refreshActiveTab();
    };

    // Listen for URL / title updates in active tab
    const handleUpdated = (
      _tabId: number,
      changeInfo: { status?: string; url?: string; title?: string },
      tab: chrome.tabs.Tab
    ) => {
      if (tab.active && (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title)) {
        refreshActiveTab();
      }
    };

    chrome.tabs.onActivated.addListener(handleActivated);
    chrome.tabs.onUpdated.addListener(handleUpdated);

    return () => {
      chrome.tabs.onActivated.removeListener(handleActivated);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
    };
  }, [refreshActiveTab]);

  return { tabInfo, loading, refreshActiveTab };
}
