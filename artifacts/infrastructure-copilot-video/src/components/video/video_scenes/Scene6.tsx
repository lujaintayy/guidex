import { motion } from 'framer-motion';

export function Scene6() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-brand-bg flex items-center justify-center p-[5vw]"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ rotateX: 90, opacity: 0, transformOrigin: 'top' }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* Network mesh background */}
      <div className="absolute inset-0 z-0">
        <video
          src={`${import.meta.env.BASE_URL}videos/network.mp4`}
          className="w-full h-full object-cover opacity-15"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-brand-bg" />
      </div>

      <div className="w-full max-w-[70vw] z-10 grid grid-cols-2 gap-[4vw] items-center">
        
        <div>
          <motion.div 
            className="inline-block px-[1.5vw] py-[0.5vw] mb-[1.5vw] rounded-full border border-brand-accent text-brand-accent font-mono text-[1vw] tracking-widest bg-brand-accent/10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            ADMIN PORTAL
          </motion.div>
          
          <motion.h2
            className="text-[4vw] font-sans font-bold text-white mb-[1.5vw] leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            Granular Role-Based Access Control
          </motion.h2>

          <motion.p
            className="text-[1.5vw] text-brand-muted font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Manage organizational boundaries with zero friction.
          </motion.p>
        </div>

        {/* Roles List */}
        <div className="flex flex-col gap-[1vw] relative">
          <motion.div 
            className="absolute -left-[3vw] top-0 bottom-0 w-[1px] bg-brand-border"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          />

          {[
            { role: 'Administrator', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'text-brand-accent', bg: 'bg-brand-accent' },
            { role: 'Engineer', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', color: 'text-brand-primary', bg: 'bg-brand-primary' },
            { role: 'Reviewer', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', color: 'text-brand-warning', bg: 'bg-brand-warning' },
          ].map((item, i) => (
            <motion.div
              key={item.role}
              className="bg-brand-surface border border-brand-border p-[1.5vw] rounded-[1vw] flex items-center gap-[1.5vw] relative overflow-hidden group"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 + i * 0.2, type: 'spring' }}
            >
              <motion.div 
                className={`absolute left-0 top-0 bottom-0 w-[0.2vw] ${item.bg}`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 2 + i * 0.2, duration: 0.5 }}
              />
              <div className={`w-[3vw] h-[3vw] rounded-[0.5vw] bg-[#13161f] flex items-center justify-center border border-brand-border ${item.color}`}>
                <svg className="w-[1.5vw] h-[1.5vw]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-[1.5vw] font-bold mb-[0.2vw]">{item.role}</div>
                <div className="text-[1vw] font-mono text-brand-muted">
                  {i === 0 ? 'Full environment access' : i === 1 ? 'Deploy & manage resources' : 'Approve/reject deployments'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[2vw] font-bold text-white mb-[0.2vw]">
                  {i === 0 ? '3' : i === 1 ? '24' : '8'}
                </div>
                <div className="text-[0.8vw] font-mono text-brand-muted uppercase tracking-wider">Members</div>
              </div>
            </motion.div>
          ))}

        </div>
      </div>
    </motion.div>
  );
}
