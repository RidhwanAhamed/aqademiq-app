import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Monitor, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallBanner() {
  const { isInstalled, platform } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = sessionStorage.getItem('install-banner-dismissed');
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('install-banner-dismissed', 'true');
    setIsDismissed(true);
  };

  if (isInstalled || isDismissed) return null;

  const platformText = {
    ios: 'Install Aqademiq on your iPhone for quick access anytime',
    android: 'Install Aqademiq on your device for a native app experience',
    desktop: 'Install Aqademiq on your computer for faster access'
  };

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {platform === 'desktop' ? (
            <Monitor className="w-5 h-5 text-primary flex-shrink-0" />
          ) : (
            <Smartphone className="w-5 h-5 text-primary flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm sm:text-base">{platformText[platform]}</p>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Works offline • Fast loading • No app store needed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/install')}
            className="whitespace-nowrap"
          >
            Learn How
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDismiss}
            className="h-8 w-8 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
