const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Needed when the portal runs behind a reverse proxy on the internal server.
    serverActions: allowedOrigins.length ? { allowedOrigins } : undefined,
  },
};

export default nextConfig;
