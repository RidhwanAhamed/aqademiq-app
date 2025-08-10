import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Sparkles, MessageCircle, Zap, Star } from 'lucide-react';

interface UpgradeToPremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: 'ai-insights' | 'studysage';
}

export function UpgradeToPremiumDialog({ open, onOpenChange, feature }: UpgradeToPremiumDialogProps) {
  const handleUpgrade = () => {
    // For now, just close the dialog - in a real app this would redirect to payment
    window.open('https://stripe.com', '_blank');
  };

  const getFeatureDetails = () => {
    switch (feature) {
      case 'ai-insights':
        return {
          title: 'Unlimited AI Insights',
          subtitle: 'Daily AI insights limit reached',
          features: [
            'Unlimited AI study insights',
            'Unlimited file upload',
            'Priority AI processing',
            'Early access to new updates'
          ],
          icon: <Sparkles className="w-6 h-6" />
        };
      case 'studysage':
        return {
          title: 'Unlimited StudySage Chat',
          subtitle: 'Free token limit reached',
          features: [
            'Unlimited token usage',
            'Unlimited file upload',
            'Advanced AI tutoring',
            'Early access to new updates'
          ],
          icon: <MessageCircle className="w-6 h-6" />
        };
    }
  };

  const details = getFeatureDetails();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <Crown className="w-5 h-5 text-yellow-500" />
            Upgrade to Premium
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  {details.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{details.title}</h3>
                  <p className="text-sm text-muted-foreground">{details.subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Premium Features
            </h4>
            <ul className="space-y-2">
              {details.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <Zap className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}