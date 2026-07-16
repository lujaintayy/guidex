import { motion } from 'framer-motion';

export function Scene2() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex flex-col justify-center items-center text-center px-[5vw] bg-brand-bg"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
      transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 z-0">
        <video
          src={`${import.meta.env.BASE_URL}videos/network.mp4`}
          className="w-full h-full object-cover opacity-20"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-bg via-transparent to-brand-bg opacity-90" />
      </div>

      <div className="z-10 flex flex-col items-center">
        <motion.div
          className="w-[12vw] h-[12vw] rounded-[2vw] bg-brand-surface border border-brand-border flex items-center justify-center mb-[2vw] box-glow relative overflow-hidden"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.5 }}
        >
          <motion.div 
            className="absolute inset-0 bg-brand-primary opacity-20"
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <svg className="w-[6vw] h-[6vw] text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        </motion.div>

        <motion.h1
          className="text-[5vw] font-sans font-bold tracking-tight text-white mb-[1.5vw]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          Infrastructure <span className="text-brand-primary text-glow">Copilot</span>
        </motion.h1>

        <motion.p
          className="text-[2vw] font-mono text-brand-muted max-w-[50vw]"
          initial={{ opacity: 0, filter: 'blur(5px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1, delay: 2 }}
        >
          Deploy with confidence.
        </motion.p>
        
        <motion.div 
          className="mt-[3vw] flex gap-[1vw] opacity-70"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ staggerChildren: 0.2, delayChildren: 3 }}
        >
          {['PLAN', 'VALIDATE', 'DEPLOY', 'MONITOR'].map((text, i) => (
            <motion.div 
              key={text}
              className="px-[1vw] py-[0.5vw] border border-brand-border rounded-[0.2vw] font-mono text-[0.8vw] tracking-widest text-brand-primary"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              {text}
            </motion.div>
          ))}
        </motion.div>
      </div>
      
      {/* Background ambient glow */}
      <motion.div 
        className="absolute bottom-0 w-[50vw] h-[25vw] bg-brand-primary rounded-[100%] opacity-10 blur-[120px]"
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        transition={{ duration: 2, delay: 1, ease: "easeOut" }}
      />
    </motion.div>
  );
}
