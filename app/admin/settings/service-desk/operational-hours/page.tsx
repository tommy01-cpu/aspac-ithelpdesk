'use client';

import { useState, useEffect } from 'react';
import { Clock, Plus, Minus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// Tooltip component for hover info
const InfoTooltip = ({ children, content }: { children: React.ReactNode; content: string | React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg">
          <div className="text-sm text-amber-800">
            {content}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-200"></div>
        </div>
      )}
    </div>
  );
};

interface WorkingHours {
  start: string;
  end: string;
}

interface BreakHours {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  type: 'standard' | 'custom' | 'not-set';
  workingHours: WorkingHours;
  breakHours: BreakHours[];
}

interface ExclusionRule {
  excludeOn: string;
  weekSelection: string;
  monthSelection: string;
}

interface OperationalHoursData {
  workingTimeType: 'round-clock' | 'standard';
  standardHours: WorkingHours;
  standardBreak: BreakHours;
  days: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  exclusionRules: ExclusionRule[];
}

const timeOptions = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

export default function OperationalHoursTab() {
  const [data, setData] = useState<OperationalHoursData>({
    workingTimeType: 'standard',
    standardHours: { start: '08:00', end: '18:00' },
    standardBreak: { start: '12:00', end: '13:00' },
    days: {
      monday: {
        enabled: true,
        type: 'standard',
        workingHours: { start: '08:00', end: '18:00' },
        breakHours: [{ start: '12:00', end: '13:00' }]
      },
      tuesday: {
        enabled: true,
        type: 'standard',
        workingHours: { start: '08:00', end: '18:00' },
        breakHours: [{ start: '12:00', end: '13:00' }]
      },
      wednesday: {
        enabled: true,
        type: 'standard',
        workingHours: { start: '08:00', end: '18:00' },
        breakHours: [{ start: '12:00', end: '13:00' }]
      },
      thursday: {
        enabled: true,
        type: 'standard',
        workingHours: { start: '08:00', end: '18:00' },
        breakHours: [{ start: '12:00', end: '13:00' }]
      },
      friday: {
        enabled: true,
        type: 'standard',
        workingHours: { start: '08:00', end: '18:00' },
        breakHours: [{ start: '12:00', end: '13:00' }]
      },
      saturday: {
        enabled: true,
        type: 'custom',
        workingHours: { start: '08:00', end: '12:00' },
        breakHours: []
      },
      sunday: {
        enabled: false,
        type: 'not-set',
        workingHours: { start: '08:00', end: '18:00' },
        breakHours: []
      }
    },
    exclusionRules: [
      {
        excludeOn: 'Specify weeks',
        weekSelection: '--select--',
        monthSelection: 'of every month'
      }
    ]
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load operational hours data from backend
  useEffect(() => {
    fetchOperationalHours();
  }, []);

  const fetchOperationalHours = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/operational-hours');
      const result = await response.json();
      
      if (result.success && result.operationalHours) {
        transformBackendDataToFrontend(result.operationalHours);
      }
    } catch (error) {
      console.error('Error fetching operational hours:', error);
    } finally {
      setLoading(false);
    }
  };

  const transformBackendDataToFrontend = (backendData: any) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daySchedules: any = {};

    // Initialize all days with default values
    days.forEach((dayName, index) => {
      const dayData = backendData.workingDays?.find((wd: any) => wd.dayOfWeek === index);
      
      if (dayData) {
        daySchedules[dayName] = {
          enabled: dayData.isEnabled,
          type: dayData.scheduleType,
          workingHours: {
            start: dayData.scheduleType === 'custom' ? dayData.customStartTime : backendData.standardStartTime || '08:00',
            end: dayData.scheduleType === 'custom' ? dayData.customEndTime : backendData.standardEndTime || '18:00'
          },
          breakHours: dayData.breakHours?.map((br: any) => ({
            start: br.startTime,
            end: br.endTime
          })) || []
        };
      } else {
        // Default schedule for missing days
        daySchedules[dayName] = {
          enabled: index >= 1 && index <= 5, // Mon-Fri enabled by default
          type: 'standard',
          workingHours: { start: '08:00', end: '18:00' },
          breakHours: [{ start: '12:00', end: '13:00' }]
        };
      }
    });

    setData({
      workingTimeType: backendData.workingTimeType || 'standard',
      standardHours: {
        start: backendData.standardStartTime || '08:00',
        end: backendData.standardEndTime || '18:00'
      },
      standardBreak: {
        start: backendData.standardBreakStart || '12:00',
        end: backendData.standardBreakEnd || '13:00'
      },
      days: daySchedules,
      exclusionRules: backendData.exclusionRules?.map((rule: any) => ({
        excludeOn: rule.excludeOn,
        weekSelection: rule.weekSelection || '--select--',
        monthSelection: rule.monthSelection
      })) || []
    });
  };

  const saveOperationalHours = async () => {
    try {
      setSaving(true);
      
      // Transform frontend data to backend format
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const workingDays = days.map((dayName, index) => {
        const dayData = data.days[dayName as keyof typeof data.days];
        return {
          dayOfWeek: index,
          isEnabled: dayData.enabled,
          scheduleType: dayData.type,
          customStartTime: dayData.type === 'custom' ? dayData.workingHours.start : null,
          customEndTime: dayData.type === 'custom' ? dayData.workingHours.end : null,
          breakHours: dayData.breakHours.map(br => ({
            startTime: br.start,
            endTime: br.end
          }))
        };
      });

      const payload = {
        workingTimeType: data.workingTimeType,
        standardStartTime: data.standardHours.start,
        standardEndTime: data.standardHours.end,
        standardBreakStart: data.standardBreak.start,
        standardBreakEnd: data.standardBreak.end,
        workingDays,
        exclusionRules: data.exclusionRules.map(rule => ({
          excludeOn: rule.excludeOn,
          weekSelection: rule.weekSelection !== '--select--' ? rule.weekSelection : null,
          monthSelection: rule.monthSelection
        }))
      };

      const response = await fetch('/api/operational-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Operational hours saved successfully!');
      } else {
        alert('Failed to save operational hours: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving operational hours:', error);
      alert('Failed to save operational hours');
    } finally {
      setSaving(false);
    }
  };

  const updateWorkingTimeType = (type: 'round-clock' | 'standard') => {
    setData(prev => {
      const newData = { ...prev, workingTimeType: type };
      
      // Update working days based on the selected type
      if (type === 'standard') {
        // Update all days with standard type to use the standard hours
        Object.keys(newData.days).forEach(dayKey => {
          const day = dayKey as keyof typeof newData.days;
          if (newData.days[day].type === 'standard') {
            newData.days[day].workingHours = { ...prev.standardHours };
            newData.days[day].breakHours = [{ ...prev.standardBreak }];
          }
        });
      }
      
      return newData;
    });
  };

  const updateStandardHours = (field: 'start' | 'end', value: string) => {
    setData(prev => {
      const newStandardHours = { ...prev.standardHours, [field]: value };
      const newData = {
        ...prev,
        standardHours: newStandardHours
      };
      
      // Update all days with standard type to use the new standard hours
      Object.keys(newData.days).forEach(dayKey => {
        const day = dayKey as keyof typeof newData.days;
        if (newData.days[day].type === 'standard') {
          newData.days[day].workingHours = { ...newStandardHours };
        }
      });
      
      return newData;
    });
  };

  const updateStandardBreak = (field: 'start' | 'end', value: string) => {
    setData(prev => {
      const newStandardBreak = { ...prev.standardBreak, [field]: value };
      const newData = {
        ...prev,
        standardBreak: newStandardBreak
      };
      
      // Update all days with standard type to use the new standard break hours
      Object.keys(newData.days).forEach(dayKey => {
        const day = dayKey as keyof typeof newData.days;
        if (newData.days[day].type === 'standard') {
          newData.days[day].breakHours = [{ ...newStandardBreak }];
        }
      });
      
      return newData;
    });
  };

  const updateDaySchedule = (day: keyof typeof data.days, updates: Partial<DaySchedule>) => {
    setData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: { ...prev.days[day], ...updates }
      }
    }));
  };

  const addBreakHours = (day: keyof typeof data.days) => {
    const newBreak = { start: '12:00', end: '13:00' };
    setData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          breakHours: [...prev.days[day].breakHours, newBreak]
        }
      }
    }));
  };

  const removeBreakHours = (day: keyof typeof data.days, index: number) => {
    setData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          breakHours: prev.days[day].breakHours.filter((_, i) => i !== index)
        }
      }
    }));
  };

  const updateBreakHours = (day: keyof typeof data.days, index: number, field: 'start' | 'end', value: string) => {
    setData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          breakHours: prev.days[day].breakHours.map((br, i) => 
            i === index ? { ...br, [field]: value } : br
          )
        }
      }
    }));
  };

  const updateExclusionRule = (index: number, field: keyof ExclusionRule, value: string) => {
    setData(prev => ({
      ...prev,
      exclusionRules: prev.exclusionRules.map((rule, i) => 
        i === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const addExclusionRule = () => {
    const newRule: ExclusionRule = {
      excludeOn: 'Specify weeks',
      weekSelection: '--select--',
      monthSelection: 'of every month'
    };
    setData(prev => ({
      ...prev,
      exclusionRules: [...prev.exclusionRules, newRule]
    }));
  };

  const removeExclusionRule = (index: number) => {
    setData(prev => ({
      ...prev,
      exclusionRules: prev.exclusionRules.filter((_, i) => i !== index)
    }));
  };

  const calculateHours = (start: string, end: string) => {
    const startTime = new Date(`2024-01-01 ${start}`);
    const endTime = new Date(`2024-01-01 ${end}`);
    const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    return `${diff}hrs`;
  };

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday', 
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Loading operational hours...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Operational Hours</h2>
        <p className="text-slate-600">Configure working hours and break times for your organization</p>
      </div>

      {/* Unified Working Time and Days Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-lg font-semibold text-slate-800">Working time</h3>
          <InfoTooltip 
            content={
              <>
                <p className="font-medium mb-1">SLA due by time calculation</p>
                <p>SLA due by time is calculated based on selected operational hours. Add custom work hours per day by overriding the standard hours.</p>
              </>
            }
          >
            <Info className="h-4 w-4 text-slate-400 cursor-help" />
          </InfoTooltip>
        </div>

        <div className="space-y-6">
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2"></div>
            <div className="col-span-2 items">
              
            </div>
            <div className="col-span-2">
              <Label className="text-sm font-medium">Start Time</Label>
              <p className="text-xs text-slate-500">(Hours : Minutes)</p>
            </div>
            <div className="col-span-1"></div>
            <div className="col-span-2">
              <Label className="text-sm font-medium">End Time</Label>
              <p className="text-xs text-slate-500">(Hours : Minutes)</p>
            </div>
            <div className="col-span-2"></div>
          </div>

          {/* Round the Clock Option */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2 flex items-center space-x-2">
              <input
                type="radio"
                id="round-clock"
                name="workingTime"
                checked={data.workingTimeType === 'round-clock'}
                onChange={() => updateWorkingTimeType('round-clock')}
                className="w-4 h-4 text-blue-600"
              />
              <Label htmlFor="round-clock" className="font-medium">Round the clock</Label>
            </div>
            <div className="col-span-2"></div>
            {data.workingTimeType === 'round-clock' && (
              <>
                <div className="col-span-2">
                  <div className="h-10 px-3 py-2 border border-slate-200 rounded-md bg-slate-50 flex items-center text-slate-500">
                    24 Hours
                  </div>
                </div>
                <div className="col-span-1 text-center">-</div>
                <div className="col-span-2">
                  <div className="h-10 px-3 py-2 border border-slate-200 rounded-md bg-slate-50 flex items-center text-slate-500">
                    24 Hours
                  </div>
                </div>
                <div className="col-span-2 text-sm text-slate-600">
                  24hrs
                </div>
              </>
            )}
            {data.workingTimeType !== 'round-clock' && (
              <div className="col-span-6"></div>
            )}
          </div>

          {/* Standard Working Hours Option */}
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2 flex items-center space-x-2">
              <input
                type="radio"
                id="standard-hours"
                name="workingTime"
                checked={data.workingTimeType === 'standard'}
                onChange={() => updateWorkingTimeType('standard')}
                className="w-4 h-4 text-blue-600"
              />
              <Label htmlFor="standard-hours" className="font-medium">Standard working hours</Label>
            </div>
            <div className="col-span-2"></div>
            
            {data.workingTimeType === 'standard' && (
              <>
                <div className="col-span-2">
                  <Select value={data.standardHours.start} onValueChange={(value) => updateStandardHours('start', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 text-center">-</div>
                <div className="col-span-2">
                  <Select value={data.standardHours.end} onValueChange={(value) => updateStandardHours('end', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 text-sm text-slate-600">
                  {calculateHours(data.standardHours.start, data.standardHours.end)}
                </div>
              </>
            )}
          </div>

          {/* Break Hours */}
          {data.workingTimeType === 'standard' && (
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-2"></div>
              <div className="col-span-2">
                <Label className="text-sm font-medium">Break Hours</Label>
              </div>
              <div className="col-span-2">
                <Select value={data.standardBreak.start} onValueChange={(value) => updateStandardBreak('start', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 text-center">-</div>
              <div className="col-span-2">
                <Select value={data.standardBreak.end} onValueChange={(value) => updateStandardBreak('end', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 text-sm text-slate-600">
                {calculateHours(data.standardBreak.start, data.standardBreak.end)}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-200 my-6"></div>

          {/* Working Days Header */}
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-slate-800">Working days</h4>
          </div>

          {/* Working Days */}
          {Object.entries(data.days).map(([dayKey, dayData]) => {
            const day = dayKey as keyof typeof data.days;
            return (
              <div key={day} className="space-y-2">
                {/* Day Header */}
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-2 flex items-center space-x-2">
                    <Checkbox
                      checked={dayData.enabled}
                      onCheckedChange={(checked) => updateDaySchedule(day, { enabled: checked as boolean })}
                    />
                    <Label className="font-medium">{dayNames[day]}</Label>
                  </div>
                  
                  <div className="col-span-2">
                    {dayData.enabled && (
                      <Select 
                        value={dayData.type === 'not-set' ? 'Do Not Set' : dayData.type}
                        onValueChange={(value) => updateDaySchedule(day, { 
                          type: value === 'Do Not Set' ? 'not-set' : value as 'standard' | 'custom'
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard Hours</SelectItem>
                          <SelectItem value="custom">Custom Hours</SelectItem>
                          <SelectItem value="Do Not Set">Do Not Set</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {dayData.enabled && dayData.type !== 'not-set' && (
                    <>
                      {data.workingTimeType === 'round-clock' ? (
                        <>
                          <div className="col-span-2">
                            <div className="h-10 px-3 py-2 border border-slate-200 rounded-md bg-slate-50 flex items-center text-slate-500">
                              Round the clock
                            </div>
                          </div>
                          <div className="col-span-1 text-center">-</div>
                          <div className="col-span-2">
                            <div className="h-10 px-3 py-2 border border-slate-200 rounded-md bg-slate-50 flex items-center text-slate-500">
                              Round the clock
                            </div>
                          </div>
                          <div className="col-span-2 text-sm text-slate-600">
                            24hrs
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-2">
                            <Select 
                              value={dayData.workingHours.start} 
                              onValueChange={(value) => updateDaySchedule(day, { 
                                workingHours: { ...dayData.workingHours, start: value }
                              })}
                              disabled={dayData.type === 'standard'}
                            >
                              <SelectTrigger className={dayData.type === 'standard' ? 'bg-slate-50 text-slate-500' : ''}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map(time => (
                                  <SelectItem key={time} value={time}>{time}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-1 text-center">-</div>
                          <div className="col-span-2">
                            <Select 
                              value={dayData.workingHours.end} 
                              onValueChange={(value) => updateDaySchedule(day, { 
                                workingHours: { ...dayData.workingHours, end: value }
                              })}
                              disabled={dayData.type === 'standard'}
                            >
                              <SelectTrigger className={dayData.type === 'standard' ? 'bg-slate-50 text-slate-500' : ''}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map(time => (
                                  <SelectItem key={time} value={time}>{time}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2 text-sm text-slate-600">
                            {calculateHours(dayData.workingHours.start, dayData.workingHours.end)}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {dayData.type === 'not-set' && (
                    <div className="col-span-7 text-sm text-slate-500">--</div>
                  )}
                </div>

                {/* Break Hours */}
                {dayData.enabled && dayData.type !== 'not-set' && data.workingTimeType !== 'round-clock' && (
                  <div className="space-y-2">
                    {dayData.breakHours.map((breakHour, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-2"></div>
                        <div className="col-span-2">
                          <Label className="text-sm text-slate-600">Break Hours</Label>
                        </div>
                        <div className="col-span-2">
                          <Select 
                            value={breakHour.start} 
                            onValueChange={(value) => updateBreakHours(day, index, 'start', value)}
                            disabled={dayData.type === 'standard'}
                          >
                            <SelectTrigger className={dayData.type === 'standard' ? 'bg-slate-50 text-slate-500' : ''}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 text-center">-</div>
                        <div className="col-span-2">
                          <Select 
                            value={breakHour.end} 
                            onValueChange={(value) => updateBreakHours(day, index, 'end', value)}
                            disabled={dayData.type === 'standard'}
                          >
                            <SelectTrigger className={dayData.type === 'standard' ? 'bg-slate-50 text-slate-500' : ''}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 text-sm text-slate-600">
                          {calculateHours(breakHour.start, breakHour.end)}
                        </div>
                        <div className="col-span-1">
                          {dayData.type === 'custom' && dayData.breakHours.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBreakHours(day, index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Break Hours Button - Show only for custom hours */}
                    {dayData.type === 'custom' && (
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4"></div>
                        <div className="col-span-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addBreakHours(day)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Break Hours
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          onClick={saveOperationalHours}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
