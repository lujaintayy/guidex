import { motion } from 'framer-motion';

export function Scene3() {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-brand-bg overflow-hidden flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/code-texture.jpg`}
          className="w-full h-full object-cover opacity-10 mix-blend-screen"
          alt="Code texture background"
        />
      </div>

      {/* Sidebar Mockup */}
      <motion.div 
        className="w-[20vw] h-full bg-brand-surface border-r border-brand-border flex flex-col z-10 p-[1.5vw] pt-[3vw] relative"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-[1vw] mb-[4vw] text-brand-primary font-bold text-[1.5vw]">
          <svg className="w-[2vw] h-[2vw]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          InfraCopilot
        </div>

        <div className="flex flex-col gap-[1vw] font-mono text-[1vw] text-brand-muted">
          {[
            { name: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
            { name: 'Servers', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' },
            { name: 'Deployments', icon: 'M13 10V3L4 14h7v7l9-11h-7z', active: true },
            { name: 'Approvals', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { name: 'Monitoring', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' }
          ].map((item, i) => (
            <motion.div 
              key={item.name}
              className={`flex items-center gap-[1vw] p-[1vw] rounded-[0.5vw] ${item.active ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20 box-glow' : 'hover:bg-white/5'}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + i * 0.1 }}
            >
              <svg className="w-[1.2vw] h-[1.2vw]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {item.name}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 p-[3vw] relative z-10 flex flex-col justify-center">
        <motion.h2 
          className="text-[4vw] font-sans font-bold text-white mb-[1vw]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          Total Visibility.
        </motion.h2>
        
        <motion.p
          className="text-[1.5vw] font-mono text-brand-muted mb-[4vw]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
        >
          Navigate complex environments instantly.
        </motion.p>

        <div className="grid grid-cols-3 gap-[2vw]">
          {[
            { label: 'Active Clusters', value: '42', color: 'text-brand-primary' },
            { label: 'Deployments (24h)', value: '1,024', color: 'text-brand-success' },
            { label: 'Pending Approvals', value: '7', color: 'text-brand-warning' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-brand-surface border border-brand-border p-[2vw] rounded-[1vw] relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', delay: 2.2 + i * 0.2 }}
            >
              <motion.div 
                className={`absolute top-0 right-0 w-[10vw] h-[10vw] -mr-[5vw] -mt-[5vw] rounded-full opacity-10 blur-2xl bg-current ${stat.color}`} 
              />
              <div className="text-[1vw] font-mono text-brand-muted mb-[1vw] uppercase tracking-wider">{stat.label}</div>
              <div className={`text-[4vw] font-bold font-sans ${stat.color}`}>{stat.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
