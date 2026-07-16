import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence } from 'framer-motion';

import { Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, Scene7, Scene8 } from './video_scenes';

// Total video duration: ~90s
const SCENE_DURATIONS = {
  scene1: 8000,
  scene2: 10000,
  scene3: 12000,
  scene4: 14000,
  scene5: 12000,
  scene6: 12000,
  scene7: 12000,
  scene8: 10000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: 'var(--color-brand-bg, #0f1117)' }}
    >
      <AnimatePresence mode="sync">
        {currentScene === 0 && <Scene1 key="scene1" />}
        {currentScene === 1 && <Scene2 key="scene2" />}
        {currentScene === 2 && <Scene3 key="scene3" />}
        {currentScene === 3 && <Scene4 key="scene4" />}
        {currentScene === 4 && <Scene5 key="scene5" />}
        {currentScene === 5 && <Scene6 key="scene6" />}
        {currentScene === 6 && <Scene7 key="scene7" />}
        {currentScene === 7 && <Scene8 key="scene8" />}
      </AnimatePresence>
    </div>
  );
}
