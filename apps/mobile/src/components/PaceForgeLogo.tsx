import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type PaceForgeLogoProps = {
  size?: number;
};

export const PaceForgeLogo: React.FC<PaceForgeLogoProps> = ({ size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Circle cx={32} cy={32} r={32} fill="#1f6feb" opacity={0.16} />
    <Path
      d="M18 16h16c8.837 0 16 7.163 16 16s-7.163 16-16 16h-9v-8h9c4.418 0 8-3.582 8-8s-3.582-8-8-8h-7v32h-9V16z"
      fill="#58a6ff"
    />
    <Path d="M24 48h10l14-18-6-6-18 24z" fill="#2ea043" opacity={0.85} />
  </Svg>
);
