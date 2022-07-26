import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react";

const height = '480rem';

const EnteringFromBottomDiv = ({ motionKey, children, className, isVisible }: { motionKey: string, children: React.ReactNode, className?: string, isVisible: boolean }) => {
  const [isAnimationRunning, setIsAnimationRunning] = useState(false);

  return (
    <AnimatePresence>
      <motion.div
        key={motionKey}
        initial={{ y: isVisible ? 0 : '120%' }}
        animate={{ y: isVisible ? 0 : '120%' }}
        exit={{ y: '120%' }}
        className={className || ''}
        transition={{ duration: 0.33 }}
        onAnimationStart={() => setIsAnimationRunning(true)}
        onAnimationComplete={() => setIsAnimationRunning(false)}
        style={{
          zIndex: isVisible ? 1 : 0,
          height: isVisible ? height : (isAnimationRunning ? height : '0rem'),
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default EnteringFromBottomDiv;
