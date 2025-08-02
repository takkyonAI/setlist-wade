import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Configurações essenciais para Vercel
  images: {
    unoptimized: true
  },
  
  // Otimizações experimentais
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // FORCE REBUILD - PERMANENT URLS v2.1
  generateBuildId: async () => {
    return 'permanent-urls-v2-' + Date.now()
  }
};

export default nextConfig;
