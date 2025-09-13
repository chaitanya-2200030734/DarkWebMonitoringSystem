import React from 'react';
import { Download, FileText, Database, Terminal } from 'lucide-react';
import { AnalysisResult } from '../types/analysis';

interface ExportControlsProps {
  result: AnalysisResult;
}

const ExportControls: React.FC<ExportControlsProps> = ({ result }) => {
  const exportToCSV = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Filename', result.filename],
      ['Total Threats', result.totalThreats.toString()],
      ['Overall Severity', result.overallSeverity],
      ['High Risk Threats', result.severityBreakdown.high.toString()],
      ['Medium Risk Threats', result.severityBreakdown.medium.toString()],
      ['Low Risk Threats', result.severityBreakdown.low.toString()],
      ['Analysis Date', new Date(result.analyzedAt).toLocaleString()],
      [''],
      ['Category Breakdown', ''],
      ...result.categoryBreakdown.map(cat => [cat.name, cat.value.toString()]),
      [''],
      ['Top Keywords', ''],
      ...result.wordCloud.slice(0, 10).map(word => [word.text, word.value.toString()]),
      [''],
      ['Insights', ''],
      ...result.insights.map(insight => ['', insight])
    ];

    const csvContent = csvData.map(row => 
      row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `threat_analysis_${result.filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const jsonData = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `threat_analysis_${result.filename}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex space-x-3">
      <button
        onClick={exportToCSV}
        className="flex items-center space-x-2 hacker-button px-4 py-2 rounded-lg transition-all duration-300"
      >
        <FileText className="w-4 h-4" />
        <span className="font-mono">[EXPORT.CSV]</span>
      </button>
      
      <button
        onClick={exportToJSON}
        className="flex items-center space-x-2 hacker-button px-4 py-2 rounded-lg transition-all duration-300"
      >
        <Database className="w-4 h-4" />
        <span className="font-mono">[EXPORT.JSON]</span>
      </button>
      
      <button
        onClick={() => window.print()}
        className="flex items-center space-x-2 hacker-button px-4 py-2 rounded-lg transition-all duration-300"
      >
        <Terminal className="w-4 h-4" />
        <span className="font-mono">[PRINT.REPORT]</span>
      </button>
    </div>
  );
};

export default ExportControls;