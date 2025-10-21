import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Smartphone, Monitor, CheckCircle2, HelpCircle, Mail } from "lucide-react";
import { toast } from "sonner";

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.info("Install option not available on this device");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success("Aqademiq installed successfully!");
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  const handleEmailSupport = () => {
    const subject = encodeURIComponent('Installation Help Needed - Aqademiq');
    const body = encodeURIComponent(
      `Hi Aqademiq Team,\n\nI need help installing the Aqademiq app.\n\nMy device information:\n- Platform: ${platform}\n- Browser: ${navigator.userAgent}\n\nIssue description:\n\n\nThanks!`
    );
    window.location.href = `mailto:contact@aqademiq.com?subject=${subject}&body=${body}`;
  };

  if (isInstalled) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Already Installed!</h1>
          <p className="text-muted-foreground mb-6">
            Aqademiq is already installed on your device. You can access it from your home screen or app launcher.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Install Aqademiq</h1>
        <p className="text-xl text-muted-foreground">
          Get instant access to your academic hub - no app store needed!
        </p>
      </div>

      {/* Benefits */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card className="p-6">
          <Download className="w-10 h-10 text-primary mb-4" />
          <h3 className="font-semibold mb-2">Quick Access</h3>
          <p className="text-sm text-muted-foreground">
            Launch directly from your home screen like a native app
          </p>
        </Card>
        <Card className="p-6">
          <Smartphone className="w-10 h-10 text-primary mb-4" />
          <h3 className="font-semibold mb-2">Works Offline</h3>
          <p className="text-sm text-muted-foreground">
            Access your schedule and assignments even without internet
          </p>
        </Card>
        <Card className="p-6">
          <Monitor className="w-10 h-10 text-primary mb-4" />
          <h3 className="font-semibold mb-2">Fast & Responsive</h3>
          <p className="text-sm text-muted-foreground">
            Instant loading with smooth, app-like performance
          </p>
        </Card>
      </div>

      {/* Platform-specific instructions */}
      <Card className="p-8">
        {platform === 'android' && deferredPrompt && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Install on Android</h2>
            <p className="text-muted-foreground mb-6">
              Click the button below to add Aqademiq to your home screen
            </p>
            <Button size="lg" onClick={handleInstall}>
              <Download className="w-5 h-5 mr-2" />
              Install App
            </Button>
          </div>
        )}

        {platform === 'ios' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Install on iOS</h2>
            <ol className="space-y-4 text-left">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
                <p>Tap the <strong>Share</strong> button in Safari (square with arrow pointing up)</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
                <p>Scroll down and tap <strong>"Add to Home Screen"</strong></p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
                <p>Tap <strong>"Add"</strong> in the top-right corner</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</span>
                <p>Find the Aqademiq icon on your home screen!</p>
              </li>
            </ol>
          </div>
        )}

        {platform === 'desktop' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Install on Desktop</h2>
            {deferredPrompt ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-6">
                  Click the button below to install Aqademiq on your computer
                </p>
                <Button size="lg" onClick={handleInstall}>
                  <Download className="w-5 h-5 mr-2" />
                  Install App
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  Look for the install icon in your browser's address bar:
                </p>
                <ul className="space-y-3 text-left">
                  <li className="flex items-start gap-3">
                    <span className="text-primary">•</span>
                    <p><strong>Chrome/Edge:</strong> Click the install icon (⊕ or computer icon) in the address bar</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary">•</span>
                    <p><strong>Firefox:</strong> Click the three dots menu → "Install Aqademiq"</p>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="text-center mt-8">
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Skip for now
        </Button>
      </div>

      <div className="mt-8">
        <Card className="p-6 bg-gradient-to-r from-muted/50 to-muted/30 border-muted">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <HelpCircle className="w-5 h-5" />
              <p className="text-sm">
                Having trouble installing? We're here to help!
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleEmailSupport}
              className="gap-2"
            >
              <Mail className="w-4 h-4" />
              Having Trouble?
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Install;