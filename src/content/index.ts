import { extractTablesFromDocument, highlightTable } from '../extraction/tableExtractor.js';
import type { ExtensionMessage, PageResourceItem } from '../types/messages.js';

// Self-executing content script listener
(function initContentScript() {
  if ((window as unknown as { __DATALENS_CONTENT_INITIALIZED__?: boolean }).__DATALENS_CONTENT_INITIALIZED__) {
    return;
  }
  (window as unknown as { __DATALENS_CONTENT_INITIALIZED__?: boolean }).__DATALENS_CONTENT_INITIALIZED__ = true;

  console.log('[DataLens] Content script injected and active on', window.location.href);

  let lastTableCount = document.querySelectorAll('table').length;
  let mutationTimeout: number | null = null;

  // Module 4: MutationObserver for dynamically rendered tables
  const observer = new MutationObserver((mutations) => {
    let hasRelevantDomChange = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            if (node.tagName === 'TABLE' || node.querySelector('table')) {
              hasRelevantDomChange = true;
              break;
            }
          }
        }
      }
      if (hasRelevantDomChange) break;
    }

    if (hasRelevantDomChange) {
      if (mutationTimeout !== null) {
        window.clearTimeout(mutationTimeout);
      }
      mutationTimeout = window.setTimeout(() => {
        const currentCount = document.querySelectorAll('table').length;
        if (currentCount !== lastTableCount) {
          lastTableCount = currentCount;
          try {
            chrome.runtime.sendMessage({
              type: 'DYNAMIC_TABLES_UPDATE',
              payload: {
                tableCount: currentCount,
                hasNewTables: true,
              },
            }).catch(() => {
              // Side panel might be closed, gracefully ignore
            });
          } catch {
            // Ignore runtime errors
          }
        }
      }, 500);
    }
  });

  try {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } catch {
    // Body might not be ready yet
  }

  // Discover page resources: CSV links, JSON links, application/json scripts
  function findAccessibleResources(): PageResourceItem[] {
    const resources: PageResourceItem[] = [];
    const seenUrls = new Set<string>();

    // 1. Scan links for .csv
    const links = Array.from(document.querySelectorAll('a[href]'));
    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;
      const lower = href.toLowerCase().split('?')[0];
      const fullUrl = new URL(href, window.location.href).href;

      if (lower.endsWith('.csv')) {
        if (!seenUrls.has(fullUrl)) {
          seenUrls.add(fullUrl);
          resources.push({
            type: 'csv',
            url: fullUrl,
            label: link.textContent?.trim() || fullUrl.split('/').pop() || 'CSV Resource',
          });
        }
      } else if (lower.endsWith('.json')) {
        if (!seenUrls.has(fullUrl)) {
          seenUrls.add(fullUrl);
          resources.push({
            type: 'json',
            url: fullUrl,
            label: link.textContent?.trim() || fullUrl.split('/').pop() || 'JSON Resource',
          });
        }
      }
    }

    // 2. Scan script tags with application/json or __NEXT_DATA__
    const scripts = Array.from(document.querySelectorAll('script[type="application/json"], script[id="__NEXT_DATA__"]'));
    for (let idx = 0; idx < Math.min(scripts.length, 5); idx++) {
      const script = scripts[idx];
      const id = script.id || `json-script-${idx + 1}`;
      resources.push({
        type: 'json',
        url: `inline://${id}`,
        label: `Embedded JSON (${id})`,
      });
    }

    return resources;
  }

  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => {
      switch (message.type) {
        case 'PING': {
          sendResponse({ type: 'PONG', ready: true });
          return true;
        }

        case 'GET_PAGE_INFO_REQUEST': {
          sendResponse({
            type: 'GET_PAGE_INFO_RESPONSE',
            payload: {
              title: document.title || 'Untitled Webpage',
              url: window.location.href,
            },
          });
          return true;
        }

        case 'SCAN_TABLES_REQUEST': {
          try {
            const result = extractTablesFromDocument(document);
            sendResponse({
              type: 'SCAN_TABLES_RESPONSE',
              payload: result,
            });
          } catch (err: unknown) {
            sendResponse({
              type: 'SCAN_TABLES_RESPONSE',
              payload: {
                success: false,
                metadata: {
                  extractedAt: Date.now(),
                  pageTitle: document.title,
                  pageUrl: window.location.href,
                  totalTables: 0,
                  totalCells: 0,
                },
                tables: [],
                error: err instanceof Error ? err.message : String(err),
              },
            });
          }
          return true;
        }

        case 'FIND_PAGE_RESOURCES_REQUEST': {
          const resources = findAccessibleResources();
          sendResponse({
            type: 'FIND_PAGE_RESOURCES_RESPONSE',
            payload: { resources },
          });
          return true;
        }

        case 'HIGHLIGHT_TABLE_REQUEST': {
          const highlighted = highlightTable(message.tableId);
          sendResponse({
            type: 'HIGHLIGHT_TABLE_RESPONSE',
            success: highlighted,
          });
          return true;
        }

        default:
          return false;
      }
    }
  );
})();
