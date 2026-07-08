/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/Dashboard/Courses', destination: '/courses', permanent: true },
      { source: '/Dashboard/Courses/:id', destination: '/courses/:id', permanent: true },
      { source: '/Dashboard/Settings', destination: '/Profile', permanent: true },
      { source: '/Dashboard/Settings/:path*', destination: '/Profile/:path*', permanent: true },
      { source: '/Dashboard/Profile', destination: '/Profile', permanent: true },
      { source: '/Dashboard/Profile/:path*', destination: '/Profile/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
