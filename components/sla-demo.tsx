'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SLADemo() {
  const [ticketDate, setTicketDate] = useState('');
  const [slaHours, setSlaHours] = useState('24');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculateSLA = async () => {
    if (!ticketDate || !slaHours) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sla-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketCreatedDate: ticketDate,
          slaHours: parseInt(slaHours),
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error calculating SLA:', error);
      alert('Error calculating SLA');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'text-green-600 bg-green-50';
      case 'at-risk':
        return 'text-yellow-600 bg-yellow-50';
      case 'breached':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          SLA Calculator Demo
        </h2>
        <p className="text-slate-600 mb-6">
          This demo shows how the operational hours configuration affects SLA calculations.
          The system considers working hours, breaks, and non-working days when calculating due dates.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ticketDate">Ticket Created Date & Time</Label>
            <Input
              id="ticketDate"
              type="datetime-local"
              value={ticketDate}
              onChange={(e) => setTicketDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="slaHours">SLA Hours</Label>
            <Input
              id="slaHours"
              type="number"
              value={slaHours}
              onChange={(e) => setSlaHours(e.target.value)}
              placeholder="24"
              className="mt-1"
            />
          </div>

          <Button 
            onClick={calculateSLA} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Calculating...' : 'Calculate SLA Due Date'}
          </Button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold mb-3">SLA Calculation Result:</h3>
            
            {result.success ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Ticket Created:</span>
                    <p className="text-sm text-slate-600">
                      {formatDate(result.sla.ticketCreatedDate)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">SLA Hours:</span>
                    <p className="text-sm text-slate-600">
                      {result.sla.slaHours} hours
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Due Date:</span>
                    <p className="text-sm text-slate-600">
                      {formatDate(result.sla.dueDate)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getStatusColor(result.sla.status)}`}>
                      {result.sla.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <span className="font-medium">Remaining Time:</span>
                  <p className="text-sm text-slate-600">
                    {result.sla.remainingHours} hours, {result.sla.remainingMinutes} minutes
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-red-600">
                <p className="font-medium">Error:</p>
                <p className="text-sm">{result.error}</p>
                {result.details && (
                  <p className="text-xs mt-1">{result.details}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• SLA calculations respect your configured operational hours</li>
            <li>• Time during breaks and non-working days is excluded</li>
            <li>• Tickets created outside working hours start counting from the next working time</li>
            <li>• Status changes based on remaining time: On-track → At-risk (≤2hrs) → Breached</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
