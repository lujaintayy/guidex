import { motion } from 'framer-motion';

export function Scene1() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex flex-col justify-center items-center text-center px-[5vw]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 z-0">
        <video
          src={`${import.meta.env.BASE_URL}videos/datacenter.mp4`}
          className="w-full h-full object-cover opacity-30"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-bg to-transparent opacity-80" />
      </div>

      <div className="z-10 w-full max-w-[60vw]">
        <motion.div
          className="flex flex-col gap-[1.5vw] font-mono text-brand-warning text-[1.5vw] mb-[3vw] text-left"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            {'>'} ERROR: Server timeout on db-prod-03
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
            {'>'} ERROR: Deployment failed. Rolling back...
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>
            {'>'} FATAL: Manual intervention required.
          </motion.div>
        </motion.div>

        <motion.h1
          className="text-[5vw] leading-tight font-sans font-bold tracking-tight text-white mt-[3vw] text-left"
          initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.2, delay: 3, ease: [0.16, 1, 0.3, 1] }}
        >
          Infrastructure is <span className="text-brand-warning">Chaos.</span>
        </motion.h1>
        
        <motion.p
          className="text-[1.5vw] text-brand-muted mt-[1.5vw] text-left max-w-[40vw] font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 4.5 }}
        >
          Manual deployments. Fragile scripts.
          <br />
          Undocumented systems.
        </motion.p>
      </div>

      {/* Persistent floating elements for depth */}
      <motion.div 
        className="absolute top-1/4 right-1/4 w-[25vw] h-[25vw] rounded-full bg-brand-warning opacity-10 blur-[100px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
