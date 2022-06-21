import { motion, AnimatePresence } from "framer-motion";

const FadeInDiv = ({ motionKey, children, className, isVisible }: { motionKey: string, children: React.ReactNode, className?: string, isVisible: boolean }) => {
  return (
    <AnimatePresence>
      {isVisible && <motion.div
        key={motionKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className={className || ''}
        style={{ zIndex: isVisible ? 1 : 0 }}
      >
        {children}
      </motion.div>}
    </AnimatePresence>
  );
}

export default FadeInDiv;
