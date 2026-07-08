export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen grid place-items-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 glow-radial opacity-50 pointer-events-none" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
