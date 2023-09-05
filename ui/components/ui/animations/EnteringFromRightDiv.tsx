import { motion, AnimatePresence } from "framer-motion"
import React, {useState} from "react";

const height = '100%';

const EnteringFromRightDiv = ({ motionKey, children, className, isVisible }: { motionKey: string, children: React.ReactNode, className?: string, isVisible: boolean }) => {
  const [isAnimationRunning, setIsAnimationRunning] = useState(false);

  return (
    <AnimatePresence>
      <motion.div
        key={motionKey}
        initial={{ x: isVisible ? 0 : '120%' }}
        animate={{ x: isVisible ? 0 : '120%' }}
        exit={{ x: '120%' }}
        className={className || ''}
        transition={{ duration: 0.33 }}
        onAnimationStart={() => setIsAnimationRunning(true)}
        onAnimationComplete={() => setIsAnimationRunning(false)}
        style={{
          zIndex: isVisible ? 999 : 0,
          height: isVisible ? height : (isAnimationRunning ? height : '0rem'),
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default EnteringFromRightDiv;
