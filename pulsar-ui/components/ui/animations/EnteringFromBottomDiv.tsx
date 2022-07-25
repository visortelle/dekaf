import { motion, AnimatePresence } from "framer-motion"

const EnteringFromBottomDiv = ({ motionKey, children, className, isVisible }: { motionKey: string, children: React.ReactNode, className?: string, isVisible: boolean }) => {
  return (
    <AnimatePresence>
      <motion.div
        key={motionKey}
        initial={{ y: isVisible ? 0 : '120%' }}
        animate={{ y: isVisible ? 0 : '120%' }}
        exit={{ y: '120%' }}
        className={className || ''}
        transition={{ duration: 0.33 }}
        style={{
          zIndex: isVisible ? 1 : 0,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default EnteringFromBottomDiv;
