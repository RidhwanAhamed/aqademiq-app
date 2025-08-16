import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Sparkles, Trophy, Target, Calendar } from 'lucide-react';

interface SuccessStepProps {
  onComplete: () => void;
  isLoading: boolean;
}

export function SuccessStep({ onComplete, isLoading }: SuccessStepProps) {
  const features = [
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'AI-powered calendar that adapts to your academic needs'
    },
    {
      icon: Target,
      title: 'Goal Tracking',
      description: 'Monitor your progress and achieve your academic objectives'
    },
    {
      icon: Trophy,
      title: 'Achievement System',
      description: 'Earn badges and celebrate your learning milestones'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-8 py-4"
    >
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="relative flex justify-center"
      >
        <div className="h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center relative">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          <motion.div
            className="absolute inset-0 rounded-full bg-green-500/20"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-2 -right-2 animate-pulse" />
      </motion.div>

      {/* Welcome Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="space-y-4"
      >
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Welcome to Aqademiq!
        </h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Your intelligent academic companion is ready to help you achieve your educational goals.
        </p>
      </motion.div>

      {/* Feature Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="grid grid-cols-1 gap-4 max-w-md mx-auto"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + index * 0.2, duration: 0.4 }}
            className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-dashed"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <feature.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">{feature.title}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="space-y-4"
      >
        <Button
          onClick={onComplete}
          disabled={isLoading}
          className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Setting up your dashboard...
            </>
          ) : (
            <>
              Get Started
              <Sparkles className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          You'll be redirected to your personalized dashboard where you can start adding courses and assignments.
        </p>
      </motion.div>
    </motion.div>
  );
}