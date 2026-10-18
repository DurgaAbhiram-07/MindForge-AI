import { Composition } from 'remotion'
import { MindForgeDemo } from './MindForgeDemo'

export const RemotionRoot = () => <Composition id="MindForgeDemo" component={MindForgeDemo} durationInFrames={90 * 30} fps={30} width={1920} height={1080} />
