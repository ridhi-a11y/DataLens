import React from 'react';
import { Globe, AlertCircle, ExternalLink } from 'lucide-react';
import type { ActiveTabInfo } from '../hooks/useActiveTab.js';

interface PageContextCardProps {
  tabInfo: ActiveTabInfo;
}

export const PageContextCard: React.FC<PageContextCardProps> = ({ tabInfo }) => {
  // Extract hostname for cleaner display
  let hostname = '';
  try {
    if (tabInfo.url) {
      hostname = new URL(tabInfo.url).hostname;
    }
  } catch {
    hostname = tabInfo.url || '';
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all">
      <div className="flex items-start gap-3">
        {/* Favicon or fallback globe */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 overflow-hidden">
          {tabInfo.favIconUrl ? (
            <img
              src={tabInfo.favIconUrl}
              alt=""
              className="h-5 w-5 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Globe className="h-4.5 w-4.5 text-slate-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Active Webpage
            </span>
            {hostname && (
              <span className="truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                {hostname}
              </span>
            )}
          </div>

          <h2
            className="truncate text-xs font-semibold text-slate-800 mt-0.5"
            title={tabInfo.title}
          >
            {tabInfo.title || 'Detecting page...'}
          </h2>

          <div className="flex items-center gap-1 mt-0.5">
            <a
              href={tabInfo.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-[260px] truncate items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 transition-colors"
              title={tabInfo.url}
            >
              <span className="truncate">{tabInfo.url || 'No URL'}</span>
              <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
            </a>
          </div>
        </div>
      </div>

      {!tabInfo.isScannable && tabInfo.unscannableReason && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50/80 p-2.5 text-[11px] text-amber-800 border border-amber-200/50">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>{tabInfo.unscannableReason}</div>
        </div>
      )}
    </div>
  );
};
