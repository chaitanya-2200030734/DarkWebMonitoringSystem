export interface AnalysisResult {
  filename: string;
  totalThreats: number;
  severityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  overallSeverity: 'High' | 'Medium' | 'Low';
  categoryBreakdown: Array<{
    name: string;
    value: number;
  }>;
  timeline: Array<{
    date: string;
    threats: number;
  }>;
  wordCloud: Array<{
    text: string;
    value: number;
  }>;
  insights: string[];
  analyzedAt: string;
}