/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  transpilePackages: ['react-quill'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          'react-quill': {
            name: 'react-quill',
            test: /[\\/]node_modules[\\/]react-quill[\\/]/,
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;