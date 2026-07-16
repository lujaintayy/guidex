import { motion } from 'framer-motion';

export function Scene5() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-brand-bg flex items-center justify-center p-[5vw]"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--color-brand-surface)_0%,_var(--color-brand-bg)_100%)] opacity-80" />

      <div className="w-full max-w-[60vw] z-10 flex flex-col items-center">
        
        <motion.div 
          className="inline-block px-[1.5vw] py-[0.5vw] mb-[2vw] rounded-full border border-brand-warning text-brand-warning font-mono text-[1vw] tracking-widest bg-brand-warning/10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          REVIEWER WORKFLOW
        </motion.div>

        <motion.h2
          className="text-[4vw] font-sans font-bold text-white mb-[4vw] text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Secure Approval Queue
        </motion.h2>

        <motion.div 
          className="w-full bg-brand-surface border border-brand-border rounded-[1vw] shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, type: 'spring', damping: 25 }}
        >
          {/* Header */}
          <div className="bg-[#13161f] border-b border-brand-border p-[1.5vw] flex justify-between items-center">
            <div>
              <div className="text-brand-muted font-mono text-[1vw] mb-[0.2vw]">REQ-8942</div>
              <div className="text-[1.5vw] font-bold">Prod Database Migration</div>
            </div>
            <div className="text-right">
              <div className="text-brand-muted text-[1vw] mb-[0.2vw]">Requested By</div>
              <div className="font-mono text-brand-primary text-[1vw]">alex.chen@infra.co</div>
            </div>
          </div>

          {/* Diff/Details */}
          <div className="p-[1.5vw] grid grid-cols-2 gap-[2vw] border-b border-brand-border bg-[#0a0c10] font-mono text-[1vw]">
            <div>
              <div className="text-brand-muted mb-[1vw] uppercase text-[0.8vw]">Current State</div>
              <div className="text-red-400 space-y-1 opacity-70">
                <div>- instance_type: r5.large</div>
                <div>- storage: 200GB</div>
                <div>- iops: 1000</div>
              </div>
            </div>
            <div>
              <div className="text-brand-muted mb-[1vw] uppercase text-[0.8vw]">Proposed State</div>
              <div className="text-brand-success space-y-1">
                <div>+ instance_type: r6g.xlarge</div>
                <div>+ storage: 500GB</div>
                <div>+ iops: 3000</div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-[1.5vw] bg-brand-surface flex justify-end gap-[1vw] items-center relative">
            <motion.div 
              className="text-brand-warning font-mono text-[1vw] absolute left-[1.5vw] flex items-center gap-[0.5vw]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3, duration: 1 }}
            >
              <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-brand-warning animate-ping" />
              Pending your review
            </motion.div>

            <button className="px-[1.5vw] py-[0.5vw] border border-brand-border rounded font-mono text-[1vw] text-brand-muted hover:text-white transition-colors">
              REJECT
            </button>
            <motion.button 
              className="px-[2vw] py-[0.5vw] bg-brand-success text-white font-bold rounded font-mono text-[1vw] shadow-[0_0_15px_rgba(16,185,129,0.4)] relative overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ delay: 4, duration: 0.5 }}
            >
              <motion.div 
                className="absolute inset-0 bg-white opacity-20"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ delay: 4.2, duration: 0.5 }}
              />
              APPROVE DEPLOYMENT
            </motion.button>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
