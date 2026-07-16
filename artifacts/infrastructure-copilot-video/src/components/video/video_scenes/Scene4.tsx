import { motion } from 'framer-motion';

export function Scene4() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-brand-bg flex items-center justify-center p-[5vw]"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 z-0">
        <video
          src={`${import.meta.env.BASE_URL}videos/datacenter.mp4`}
          className="w-full h-full object-cover opacity-10"
          autoPlay
          muted
          loop
          playsInline
        />
      </div>

      <div className="w-full max-w-[70vw] z-10 flex flex-col items-center">
        
        <motion.div 
          className="inline-block px-[1.5vw] py-[0.5vw] mb-[2vw] rounded-full border border-brand-primary text-brand-primary font-mono text-[1vw] tracking-widest bg-brand-primary/10 box-glow"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          ENGINEER PORTAL
        </motion.div>

        <motion.h2
          className="text-[4vw] font-sans font-bold text-white mb-[4vw] text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          Standardized Deployments
        </motion.h2>

        <div className="w-full grid grid-cols-12 gap-[2vw] items-center">
          {/* Template Card */}
          <motion.div 
            className="col-span-4 bg-brand-surface border border-brand-border rounded-[1vw] p-[1.5vw] relative overflow-hidden"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, type: 'spring' }}
          >
            <div className="absolute top-0 left-0 w-full h-[0.2vw] bg-brand-primary" />
            <div className="text-[1.5vw] font-bold mb-[0.5vw]">Redis Cluster v2.4</div>
            <div className="text-[1vw] text-brand-muted font-mono mb-[1.5vw]">Template ID: tpl-89x2q</div>
            
            <div className="space-y-[1vw]">
              {[
                { k: 'Replicas', v: '3' },
                { k: 'Instance', v: 'r6g.xlarge' },
                { k: 'Storage', v: '500GB NVMe' }
              ].map(item => (
                <div key={item.k} className="flex justify-between font-mono text-[1vw] border-b border-brand-border/50 pb-[0.2vw]">
                  <span className="text-brand-muted">{item.k}</span>
                  <span className="text-white">{item.v}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Connection Line */}
          <motion.div 
            className="col-span-1 flex justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <motion.div 
              className="h-[0.5vw] w-full bg-brand-primary rounded"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 2, duration: 0.5 }}
            />
          </motion.div>

          {/* Execution Log */}
          <motion.div 
            className="col-span-7 bg-[#0a0c10] border border-brand-border rounded-[1vw] p-[1.5vw] font-mono text-[1vw] shadow-2xl relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.4 }}
          >
            <div className="absolute top-[1vw] right-[1vw] flex gap-[0.5vw]">
              <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-brand-border"></div>
              <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-brand-border"></div>
              <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-brand-primary animate-pulse"></div>
            </div>
            
            <div className="mb-[1vw] text-brand-muted">Deploying Template...</div>
            <div className="space-y-[0.5vw] font-mono text-[0.8vw]">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }}>
                <span className="text-brand-success">[14:02:01]</span> Validating configuration... <span className="text-brand-success">OK</span>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2 }}>
                <span className="text-brand-success">[14:02:03]</span> Provisioning 3x r6g.xlarge instances...
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.5 }}>
                <span className="text-brand-success">[14:02:45]</span> Attaching NVMe volumes... <span className="text-brand-success">OK</span>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 5.2 }}>
                <span className="text-brand-success">[14:03:10]</span> Initializing Redis cluster gossip...
              </motion.div>
              <motion.div className="text-brand-primary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 6 }}>
                {'>'} Running health checks...
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
