import React from 'react';
import { Lightbulb } from 'lucide-react';

interface InsightsSummaryProps {
  insights: string[];
}

const InsightsSummary: React.FC<InsightsSummaryProps> = ({ insights }) => {
  return (
    <div className="cyber-card p-6 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Lightbulb className="w-5 h-5 text-yellow-400 mr-2" />
        AI-Generated Insights
      </h3>
      
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-gray-300 leading-relaxed">{insight}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
        <h4 className="text-sm font-semibold text-blue-400 mb-2">Recommended Actions:</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Implement continuous monitoring for detected threat categories</li>
          <li>• Update security policies based on identified vulnerabilities</li>
          <li>• Schedule regular OSINT analysis for proactive threat detection</li>
          <li>• Share intelligence with relevant security teams and stakeholders</li>
        </ul>
      </div>
    </div>
  );
};

export default InsightsSummary;