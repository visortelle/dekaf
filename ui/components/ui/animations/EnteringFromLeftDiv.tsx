import { motion, AnimatePresence } from "framer-motion"

const EnteringFromLeftDiv = ({ motionKey, children, className, isVisible }: { motionKey: string, children: React.ReactNode, className?: string, isVisible: boolean }) => {
  return (
    <AnimatePresence>
      <motion.div
        key={motionKey}
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-200%' }}
        className={className || ''}
        transition={{ duration: 0.33 }}
        style={{ zIndex: isVisible ? 1 : 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default EnteringFromLeftDiv;
