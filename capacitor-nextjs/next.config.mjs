/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so Capacitor can bundle the built site from `out/`.
  output: 'export',
  // Capacitor serves files from the filesystem; disable Next's image optimizer.
  images: { unoptimized: true },
  // Emit `path/index.html` so routes resolve without a server.
  trailingSlash: true,
};

export default nextConfig;
