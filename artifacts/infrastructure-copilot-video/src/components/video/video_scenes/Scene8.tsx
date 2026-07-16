import { motion } from 'framer-motion';

export function Scene8() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-[#0a0c10] flex flex-col items-center justify-center p-[5vw]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      {/* Cinematic center glow */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <motion.div 
          className="w-[50vw] h-[50vw] rounded-full bg-brand-primary opacity-10 blur-[150px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="z-10 flex flex-col items-center">
        <motion.div
          className="w-[8vw] h-[8vw] rounded-[1vw] bg-brand-surface border border-brand-border flex items-center justify-center mb-[2.5vw] box-glow"
          initial={{ scale: 0, rotate: 90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.5 }}
        >
          <svg className="w-[4vw] h-[4vw] text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        </motion.div>

        <motion.h1
          className="text-[6vw] font-sans font-bold tracking-tight text-white mb-[1.5vw]"
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1, delay: 1 }}
        >
          Infrastructure <span className="text-brand-primary text-glow">Copilot</span>
        </motion.h1>

        <motion.p
          className="text-[2vw] font-mono text-brand-muted mt-[1vw]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2 }}
        >
          Deploy with confidence.
        </motion.p>
        
        {/* URL / CTA mock */}
        <motion.div 
          className="mt-[4vw] font-mono text-white text-[1.5vw] tracking-widest border-b border-brand-primary/50 pb-[0.5vw]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 3 }}
        >
          infracopilot.io
        </motion.div>
      </div>
    </motion.div>
  );
}
