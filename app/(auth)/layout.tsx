export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium">Door <span style={{ color: "var(--accent)" }}>Registry</span></h1>
        </div>
        {children}
      </div>
    </div>
  );
}
