import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Clock, Globe } from 'lucide-react';
import { 
  COMMON_TIMEZONES, 
  getUserTimezone, 
  setUserTimezone, 
  getDetectedTimezone,
  getTimezoneAbbr 
} from '@/utils/timezone';

interface TimezoneSelectorProps {
  onTimezoneChange?: (timezone: string) => void;
  showDetected?: boolean;
  compact?: boolean;
}

export function TimezoneSelector({ 
  onTimezoneChange, 
  showDetected = true,
  compact = false 
}: TimezoneSelectorProps) {
  const [currentTimezone, setCurrentTimezone] = React.useState(getUserTimezone());
  const detectedTimezone = getDetectedTimezone();
  const isDetectedDifferent = currentTimezone !== detectedTimezone;

  const handleTimezoneChange = (timezone: string) => {
    setCurrentTimezone(timezone);
    setUserTimezone(timezone);
    onTimezoneChange?.(timezone);
  };

  const useDetectedTimezone = () => {
    handleTimezoneChange(detectedTimezone);
  };

  const getCurrentTimezoneLabel = () => {
    const tz = COMMON_TIMEZONES.find(t => t.timezone === currentTimezone);
    return tz?.label || currentTimezone;
  };

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Clock className="w-3 h-3 mr-1" />
            <span className="text-xs">{getTimezoneAbbr(currentTimezone)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Time Zone</h3>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Time Zone</label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getTimezoneAbbr(currentTimezone)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {getCurrentTimezoneLabel()}
                </span>
              </div>
            </div>

            {showDetected && isDetectedDifferent && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Detected Time Zone</label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getTimezoneAbbr(detectedTimezone)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {COMMON_TIMEZONES.find(t => t.timezone === detectedTimezone)?.label || detectedTimezone}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={useDetectedTimezone}
                    className="h-6 px-2 text-xs"
                  >
                    Use
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Change Time Zone</label>
              <Select value={currentTimezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.timezone} value={tz.timezone}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getTimezoneAbbr(tz.timezone)}
                        </Badge>
                        {tz.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Time Zone Settings</h3>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-2 block">Current Time Zone</label>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{getTimezoneAbbr(currentTimezone)}</Badge>
            <span className="text-sm text-muted-foreground">
              {getCurrentTimezoneLabel()}
            </span>
          </div>
        </div>

        {showDetected && isDetectedDifferent && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Detected Time Zone</p>
                <p className="text-xs text-muted-foreground">
                  {getTimezoneAbbr(detectedTimezone)} - {COMMON_TIMEZONES.find(t => t.timezone === detectedTimezone)?.label || detectedTimezone}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={useDetectedTimezone}
              >
                Use This
              </Button>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-2 block">Change Time Zone</label>
          <Select value={currentTimezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz.timezone} value={tz.timezone}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getTimezoneAbbr(tz.timezone)}
                    </Badge>
                    {tz.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground">
          Current time: {new Date().toLocaleString([], {
            timeZone: currentTimezone,
            dateStyle: 'short',
            timeStyle: 'short'
          })}
        </div>
      </div>
    </div>
  );
}