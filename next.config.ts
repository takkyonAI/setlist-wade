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
};

export default nextConfig;
