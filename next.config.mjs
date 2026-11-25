/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // L'ancien support IA a été supprimé : les liens déjà partagés mènent à l'assistant d'accès.
      { source: '/support', destination: '/assistance', permanent: false },
    ];
  },
};

export default nextConfig;
