import Link from 'next/link';

const foodIcons = ['🍽️','🥄','🍴','🥢','🍲','🥗','🍱','🥘','🍛','🥙','🫕','🍜','🥣','🫙','🧆','🥩','🫔','🍝','🧋','🥤'];

const bgPositions = [
  [5,5],[15,12],[25,8],[35,4],[45,10],[55,6],[65,3],[75,9],[85,7],[95,5],
  [8,20],[18,28],[30,22],[42,18],[52,25],[63,20],[72,27],[88,22],[3,35],
  [12,40],[22,33],[32,38],[44,42],[54,36],[64,44],[74,39],[84,37],[93,41],
  [7,52],[17,58],[28,50],[40,55],[50,48],[60,56],[70,53],[80,60],[90,55],
  [5,70],[15,65],[25,72],[35,68],[45,75],[55,63],[65,70],[75,67],[85,73],[95,68],
  [10,82],[20,88],[30,80],[40,85],[50,90],[60,83],[70,87],[80,78],[90,85],
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col justify-between relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #f0faf5 0%, #e8f5f0 40%, #fafffe 100%)' }}
    >
      {/* Background food icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {bgPositions.map(([x, y], i) => (
          <span
            key={i}
            className="absolute select-none"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              fontSize: `${18 + (i % 4) * 5}px`,
              opacity: 0.07,
              transform: `rotate(${(i * 13 % 40) - 20}deg)`,
              animation: `float ${5 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.3) % 4}s`,
            }}
          >
            {foodIcons[i % foodIcons.length]}
          </span>
        ))}
      </div>

      {/* Center — content */}
      <div className="flex-grow flex flex-col items-center justify-center relative z-10 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 leading-tight"
          style={{ color: '#0d4f2e' }}>
          Welcome to web application<br />
          <span className="text-emerald-500">ระบบวิเคราะห์คาร์บ</span>
        </h1>

        <p className="text-sm md:text-base font-medium tracking-widest uppercase mb-8"
          style={{ color: '#6b9e84' }}>
          Carb Analysis System
        </p>

        <Link
          href="/login"
          className="w-full max-w-xs flex items-center justify-center gap-2 text-white font-semibold rounded-2xl transition-all duration-300 active:scale-95"
          style={{
            background: '#16a360',
            boxShadow: '0 8px 28px rgba(22,163,96,0.38)',
            fontSize: '18px',
            padding: '16px 0',
          }}
        >
          เริ่มต้นใช้งาน →
        </Link>
      </div>

      {/* Footer */}
      <footer
        className="py-4 text-center relative z-10 px-4"
        style={{
          background: 'rgba(255,255,255,0.7)',
          borderTop: '1px solid rgba(22,163,97,0.1)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <p className="text-xs font-medium" style={{ color: '#4a7c62' }}>
          Copyright © 2026 Information Technology for Industry
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#8aab9a' }}>
          King Mongkut&apos;s University of Technology North Bangkok
        </p>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}