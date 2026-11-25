import React from 'react';
import {Composition} from 'remotion';
import {SaklarLampu} from './SaklarLampu';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SaklarLampu"
      component={SaklarLampu}
      durationInFrames={330}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
