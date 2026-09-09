const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // `next lint` only walks app/, pages/ and src/ by default, which would skip
    // every one of these.
    dirs: ['app', 'components', 'lib', 'scripts', 'tests', 'prisma'],
  },
};

export default nextConfig;
