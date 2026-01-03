import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSplashQuote } from '@/hooks/useMotivationalQuote';

interface AnimatedSplashProps {
  onComplete: () => void;
  minimumDuration?: number;
}

export function AnimatedSplash({ onComplete, minimumDuration = 2500 }: AnimatedSplashProps) {
  const [isExiting, setIsExiting] = useState(false);
  const { quote } = useSplashQuote();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, minimumDuration);
    
    return () => clearTimeout(timer);
  }, [minimumDuration]);

  const handleExitComplete = () => {
    onComplete();
  };

  const wordmark = "Aqademiq";
  const tagline = "Supercharged Productivity";

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {!isExiting && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0A0A0A]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
              style={{
                background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.15, 0.25, 0.15],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Logo container with glow ring */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              duration: 0.6,
            }}
          >
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 -m-4 rounded-full"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(221 83% 53%) 100%)',
                filter: 'blur(20px)',
              }}
              animate={{
                opacity: [0.4, 0.7, 0.4],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
            />
            
            {/* Logo */}
            <motion.div
              className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden shadow-2xl"
              whileHover={{ scale: 1.05 }}
            >
              <img
                src="/assets/aqademiq-icon.png"
                alt="Aqademiq"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>

          {/* Wordmark with staggered letter animation */}
          <motion.div
            className="mt-8 flex items-center gap-1 z-10"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.4,
                },
              },
            }}
          >
            {wordmark.split('').map((letter, index) => (
              <motion.span
                key={index}
                className="text-2xl md:text-3xl font-bold tracking-wider text-white"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { 
                    opacity: 1, 
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }
                  },
                }}
              >
                {letter}
              </motion.span>
            ))}
          </motion.div>

          {/* Tagline */}
          <motion.p
            className="mt-4 text-sm md:text-base text-muted-foreground tracking-wide z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.8,
              duration: 0.5,
              ease: "easeOut",
            }}
          >
            {tagline}
          </motion.p>

          {/* Motivational Quote */}
          <motion.p
            className="mt-6 text-xs md:text-sm text-primary/80 italic max-w-xs md:max-w-sm text-center z-10 px-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 1.0,
              duration: 0.5,
              ease: "easeOut",
            }}
          >
            "{quote}"
          </motion.p>

          {/* Loading dots */}
          <motion.div
            className="mt-8 flex items-center gap-2 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-2 h-2 rounded-full bg-primary"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: index * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>

          {/* Subtle bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
