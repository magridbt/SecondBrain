/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Ignorar modulo canvas para pdfjs-dist
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false

    // Excluir aios-core do build (é framework separado, não parte da aplicação)
    config.resolve.fallback = {
      ...config.resolve.fallback,
    }

    // Ignorar aios-core durante a compilação
    config.watchOptions = {
      ignored: ['**/aios-core/**', '**/node_modules/**']
    }

    return config
  },
}

module.exports = nextConfig
