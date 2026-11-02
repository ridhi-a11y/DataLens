import type { ExtractionResult } from '../extraction/types.js';

export type MessageType =
  | 'PING'
  | 'SCAN_TABLES_REQUEST'
  | 'SCAN_TABLES_RESPONSE'
  | 'GET_PAGE_INFO_REQUEST'
  | 'GET_PAGE_INFO_RESPONSE'
  | 'HIGHLIGHT_TABLE_REQUEST'
  | 'HIGHLIGHT_TABLE_RESPONSE'
  | 'DYNAMIC_TABLES_UPDATE'
  | 'FIND_PAGE_RESOURCES_REQUEST'
  | 'FIND_PAGE_RESOURCES_RESPONSE';

export interface PingMessage {
  type: 'PING';
}

export interface DynamicTablesUpdateMessage {
  type: 'DYNAMIC_TABLES_UPDATE';
  payload: {
    tableCount: number;
    hasNewTables: boolean;
  };
}

export interface FindPageResourcesRequest {
  type: 'FIND_PAGE_RESOURCES_REQUEST';
}

export interface PageResourceItem {
  type: 'csv' | 'json';
  url: string;
  label: string;
}

export interface FindPageResourcesResponse {
  type: 'FIND_PAGE_RESOURCES_RESPONSE';
  payload: {
    resources: PageResourceItem[];
  };
}

export interface ScanTablesRequest {
  type: 'SCAN_TABLES_REQUEST';
}

export interface ScanTablesResponse {
  type: 'SCAN_TABLES_RESPONSE';
  payload: ExtractionResult;
}

export interface GetPageInfoRequest {
  type: 'GET_PAGE_INFO_REQUEST';
}

export interface GetPageInfoResponse {
  type: 'GET_PAGE_INFO_RESPONSE';
  payload: {
    title: string;
    url: string;
    favIconUrl?: string;
  };
}

export interface HighlightTableRequest {
  type: 'HIGHLIGHT_TABLE_REQUEST';
  tableId: string;
}

export interface HighlightTableResponse {
  type: 'HIGHLIGHT_TABLE_RESPONSE';
  success: boolean;
}

export type ExtensionMessage =
  | PingMessage
  | ScanTablesRequest
  | ScanTablesResponse
  | GetPageInfoRequest
  | GetPageInfoResponse
  | HighlightTableRequest
  | HighlightTableResponse
  | DynamicTablesUpdateMessage
  | FindPageResourcesRequest
  | FindPageResourcesResponse;
