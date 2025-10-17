import type { ExpoConfig } from '@expo/config';

const config: ExpoConfig = {
  name: 'PaceForge Mobile',
  slug: 'paceforge-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  platforms: ['ios', 'android', 'web'],
  scheme: 'paceforge',
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: ['**/*']
};

export default config;
