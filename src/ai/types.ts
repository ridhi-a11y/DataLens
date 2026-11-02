import type { FunctionId, AnalysisResult } from '../analysis/types.js';

export interface InsightItem {
  id: string;
  category: 'statistical' | 'anomaly' | 'distribution' | 'quality' | 'relationship';
  headline: string;
  observation: string;
  explanation?: string;
  supportingColumns: string[];
  confidence: number;
  suggestedAction?: {
    label: string;
    functionId: FunctionId;
    primaryColumn: string;
    secondaryColumn?: string;
  };
}

export interface NaturalLanguageQueryPlan {
  intent: 'CALCULATE' | 'FILTER' | 'TOP_N' | 'COMPARE' | 'EXPLAIN' | 'VISUALIZE' | 'GENERAL';
  functionId?: FunctionId;
  primaryColumn?: string;
  secondaryColumn?: string;
  filterCondition?: {
    column: string;
    operator: '>' | '<' | '==' | '!=' | '>=' | '<=' | 'contains';
    value: string | number;
  };
  topN?: {
    n: number;
    column: string;
    ascending: boolean;
  };
  visualizationSuggestion?: FunctionId;
  plainTextAnswer?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  queryPlan?: NaturalLanguageQueryPlan;
  calculatedResult?: AnalysisResult;
  filteredRows?: string[][];
  suggestedFunctionId?: FunctionId;
  suggestedColumn?: string;
}
