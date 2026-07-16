import { motion } from 'framer-motion';

export function Scene7() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-[#0a0c10] flex items-center justify-center p-[4vw] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 1.2, filter: 'blur(10px)', opacity: 0 }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/dashboard-abstract.png`}
          className="w-full h-full object-cover opacity-30 mix-blend-lighten"
          alt="Dashboard abstract"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c10] via-transparent to-[#0a0c10]" />
      </div>

      <div className="w-full max-w-[80vw] z-10 grid grid-cols-2 gap-[3vw] h-[80%]">
        
        {/* Left: Monitoring Charts */}
        <div className="flex flex-col gap-[1.5vw] h-full justify-center">
          <motion.div 
            className="flex items-center gap-[0.5vw] text-brand-success font-mono font-bold tracking-widest text-[1vw] mb-[1vw]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-brand-success animate-pulse" />
            LIVE TELEMETRY
          </motion.div>

          <motion.div 
            className="bg-brand-surface/80 backdrop-blur-md border border-brand-border rounded-[1vw] p-[1.5vw] h-[12vw] relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="text-[1vw] font-mono text-brand-muted mb-[1vw] uppercase">Cluster CPU Utilization</div>
            {/* Fake line chart */}
            <svg className="w-full h-[6vw]" preserveAspectRatio="none" viewBox="0 0 100 30">
              <motion.path 
                d="M0,25 Q10,20 20,22 T40,15 T60,18 T80,5 T100,10" 
                fill="none" 
                stroke="var(--color-brand-primary)" 
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1, ease: "linear" }}
              />
              <motion.path 
                d="M0,25 Q10,20 20,22 T40,15 T60,18 T80,5 T100,10 L100,30 L0,30 Z" 
                fill="url(#primary-gradient)" 
                opacity="0.2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.2 }}
                transition={{ delay: 3 }}
              />
              <defs>
                <linearGradient id="primary-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-primary)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          <motion.div 
            className="bg-brand-surface/80 backdrop-blur-md border border-brand-border rounded-[1vw] p-[1.5vw] h-[12vw] relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <div className="text-[1vw] font-mono text-brand-muted mb-[1vw] uppercase">Network I/O</div>
            <svg className="w-full h-[6vw]" preserveAspectRatio="none" viewBox="0 0 100 30">
              <motion.path 
                d="M0,20 Q15,25 30,15 T50,22 T75,10 T100,18" 
                fill="none" 
                stroke="var(--color-brand-accent)" 
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1.2, ease: "linear" }}
              />
            </svg>
          </motion.div>
        </div>

        {/* Right: AI Assistant */}
        <motion.div 
          className="bg-brand-surface/90 backdrop-blur-xl border border-brand-primary/30 rounded-[1vw] flex flex-col overflow-hidden box-glow h-full"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5, type: 'spring', damping: 20 }}
        >
          <div className="bg-[#13161f] p-[1vw] border-b border-brand-border flex items-center gap-[0.5vw]">
            <div className="w-[2vw] h-[2vw] rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary">
              <svg className="w-[1.2vw] h-[1.2vw]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="font-bold text-[1.2vw] text-white">Copilot Assistant</div>
          </div>

          <div className="p-[1.5vw] flex-1 flex flex-col gap-[1.5vw] overflow-hidden">
            <motion.div 
              className="bg-[#1a1d27] rounded-[0.5vw] p-[1vw] rounded-tr-none self-end max-w-[85%] border border-brand-border"
              initial={{ opacity: 0, scale: 0.9, originX: 1, originY: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.5 }}
            >
              <div className="text-[1vw]">We are seeing high latency on db-prod-02. Can you analyze the logs and suggest a remediation?</div>
            </motion.div>

            <motion.div 
              className="bg-brand-primary/10 rounded-[0.5vw] p-[1vw] rounded-tl-none self-start max-w-[90%] border border-brand-primary/30"
              initial={{ opacity: 0, scale: 0.9, originX: 0, originY: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 3.5 }}
            >
              <div className="flex items-center gap-[0.5vw] mb-[0.5vw] font-mono text-[0.8vw] text-brand-primary">
                <svg className="w-[1vw] h-[1vw] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ANALYZING CLUSTER LOGS...
              </div>
              
              <motion.div 
                className="text-[1vw] space-y-[0.8vw]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4.5 }}
              >
                <p>I found a spike in slow queries originating from the <code className="bg-[#13161f] px-1 rounded text-brand-accent">reporting-service</code>. The I/O wait times have increased by 400% in the last 10 minutes.</p>
                <p className="text-white font-bold">Suggested Actions:</p>
                <div className="font-mono text-[0.8vw] p-[0.8vw] bg-[#0a0c10] rounded border border-brand-border text-brand-muted">
                  1. Throttle reporting-service connections<br/>
                  2. Scale db-prod read replicas (+2)<br/>
                  3. Flush query plan cache
                </div>
                <button className="mt-[0.5vw] w-full py-[0.5vw] bg-brand-primary text-white rounded font-mono text-[1vw] font-bold shadow-lg shadow-brand-primary/20">
                  EXECUTE REMEDIATION PLAN
                </button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
