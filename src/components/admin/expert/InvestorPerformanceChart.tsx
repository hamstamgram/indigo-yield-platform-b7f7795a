import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { expertInvestorService, PositionHistoryData } from '@/services/expertInvestorService';

interface InvestorPerformanceChartProps {
  investorId: string;
}

const InvestorPerformanceChart: React.FC<InvestorPerformanceChartProps> = ({
  investorId
}) => {
  const [chartData, setChartData] = useState<PositionHistoryData[]>([]);
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [investorId, timeRange]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      // For now, we'll use a mock asset. In production, you'd aggregate across all assets
      const data = await expertInvestorService.getPositionHistory(
        investorId, 
        'BTC', 
        parseInt(timeRange)
      );
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Mock data for demonstration
      const mockData = Array.from({ length: parseInt(timeRange) }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (parseInt(timeRange) - i));
        return {
          date: date.toISOString().split('T')[0],
          balance: 10000 + Math.random() * 2000,
          value: 10000 + Math.random() * 2000,
          yieldApplied: Math.random() * 100
        };
      });
      setChartData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>
              Historical portfolio value and yield distribution
            </CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="365">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => {
                    return new Date(date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    });
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatTooltipValue(value),
                    name === 'value' ? 'Portfolio Value' : 'Balance'
                  ]}
                  labelFormatter={(date) => 
                    new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  }
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="mt-4 flex justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-primary"></div>
            <span>Portfolio Value</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-muted-foreground border-dashed"></div>
            <span>Balance</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestorPerformanceChart;