import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

const FallbackSvgIcon: React.FC<IconProps & { roleId: string }> = ({ roleId, className = 'w-full h-full', size = 64 }) => {

  switch (roleId) {
    case 'godfather':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#180408" stroke="#e11d48" strokeWidth="2.5" />
          {/* Fedora hat */}
          <ellipse cx="50" cy="42" rx="36" ry="7" fill="#4c0519" stroke="#fb7185" strokeWidth="1.5" />
          <path d="M26 41 C28 24 38 18 50 18 C62 18 72 24 74 41 Z" fill="#2d0611" stroke="#e11d48" strokeWidth="1.5" />
          <path d="M28 38 C38 34 62 34 72 38" stroke="#f43f5e" strokeWidth="3" />
          {/* Sunglasses & mustache */}
          <rect x="33" y="49" width="13" height="9" rx="3" fill="#09090b" stroke="#e11d48" strokeWidth="1.2" />
          <rect x="54" y="49" width="13" height="9" rx="3" fill="#09090b" stroke="#e11d48" strokeWidth="1.2" />
          <path d="M46 53 H54" stroke="#e11d48" strokeWidth="1.5" />
          {/* Cigar & Smoke */}
          <rect x="53" y="65" width="18" height="4" rx="1" fill="#78350f" transform="rotate(-15 53 65)" stroke="#d97706" strokeWidth="0.8" />
          <circle cx="71" cy="61" r="2" fill="#ef4444" />
          <path d="M73 60 C76 56 74 52 78 48 C81 44 80 40 84 37" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
          {/* Crossed Revolvers */}
          <path d="M28 82 L38 72 M38 72 L44 74 M38 72 L36 66" stroke="#fb7185" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M72 82 L62 72 M62 72 L56 74 M62 72 L64 66" stroke="#fb7185" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'dr_lecter':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#140207" stroke="#be123c" strokeWidth="2.5" />
          {/* Scalpel / Syringe crossed with sinister skull badge */}
          <circle cx="50" cy="42" r="18" fill="#310b17" stroke="#f43f5e" strokeWidth="1.8" />
          {/* Hannibal muzzle / mask grid */}
          <rect x="40" y="44" width="20" height="14" rx="2" fill="#0f0206" stroke="#fb7185" strokeWidth="1.2" />
          <line x1="44" y1="44" x2="44" y2="58" stroke="#fb7185" strokeWidth="1.5" />
          <line x1="50" y1="44" x2="50" y2="58" stroke="#fb7185" strokeWidth="1.5" />
          <line x1="56" y1="44" x2="56" y2="58" stroke="#fb7185" strokeWidth="1.5" />
          {/* Glowing Red Eyes */}
          <circle cx="43" cy="38" r="2.5" fill="#f43f5e" />
          <circle cx="57" cy="38" r="2.5" fill="#f43f5e" />
          {/* Syringe filled with lethal poison */}
          <rect x="24" y="68" width="52" height="10" rx="3" fill="#1e1b4b" stroke="#e11d48" strokeWidth="1.5" />
          <rect x="30" y="70" width="30" height="6" fill="#e11d48" opacity="0.8" />
          <line x1="76" y1="73" x2="88" y2="73" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="24" y1="73" x2="14" y2="73" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'natasha':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#160824" stroke="#a855f7" strokeWidth="2.5" />
          {/* Lips silenced with zipper stitches */}
          <path d="M22 48 C30 38 42 36 50 42 C58 36 70 38 78 48 C68 58 56 64 50 64 C44 64 32 58 22 48 Z" fill="#3b0764" stroke="#c084fc" strokeWidth="2" />
          <line x1="24" y1="48" x2="76" y2="48" stroke="#f43f5e" strokeWidth="2.2" />
          {/* Suture cross lines (Zipper stitches) */}
          <line x1="32" y1="42" x2="32" y2="54" stroke="#e879f9" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="41" y1="40" x2="41" y2="56" stroke="#e879f9" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="50" y1="39" x2="50" y2="57" stroke="#e879f9" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="59" y1="40" x2="59" y2="56" stroke="#e879f9" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="68" y1="42" x2="68" y2="54" stroke="#e879f9" strokeWidth="2.2" strokeLinecap="round" />
          {/* Muted sound wave with prohibition slash */}
          <path d="M42 74 C46 71 54 71 58 74" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="50" cy="24" r="10" stroke="#f43f5e" strokeWidth="2" />
          <line x1="43" y1="17" x2="57" y2="31" stroke="#f43f5e" strokeWidth="2.5" />
        </svg>
      );

    case 'terrorist':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#180404" stroke="#dc2626" strokeWidth="2.5" />
          {/* Dynamite sticks */}
          <rect x="25" y="32" width="14" height="42" rx="3" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.8" />
          <rect x="43" y="28" width="14" height="46" rx="3" fill="#991b1b" stroke="#f87171" strokeWidth="1.8" />
          <rect x="61" y="32" width="14" height="42" rx="3" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.8" />
          {/* Black straps */}
          <rect x="22" y="42" width="56" height="5" fill="#09090b" stroke="#fca5a5" strokeWidth="0.8" />
          <rect x="22" y="60" width="56" height="5" fill="#09090b" stroke="#fca5a5" strokeWidth="0.8" />
          {/* Timer Clock */}
          <rect x="36" y="47" width="28" height="14" rx="2" fill="#000000" stroke="#ef4444" strokeWidth="1.5" />
          <text x="50" y="58" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold" fontFamily="monospace">00:03</text>
          {/* Fuse & Spark */}
          <path d="M50 28 C50 18 64 20 66 12" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          <circle cx="66" cy="11" r="4" fill="#fbbf24" />
          <line x1="66" y1="4" x2="66" y2="8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <line x1="72" y1="11" x2="76" y2="11" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'mistress':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#1a0410" stroke="#f43f5e" strokeWidth="2.5" />
          {/* Femme fatale silhouette with rose and hidden dagger */}
          <path d="M50 18 C38 18 32 28 32 40 C32 48 38 56 46 60 L44 80 L56 80 L54 60 C62 56 68 48 68 40 C68 28 62 18 50 18 Z" fill="#3a0420" stroke="#fb7185" strokeWidth="1.8" />
          {/* Velvet Eye Mask with gems */}
          <path d="M34 36 C40 32 46 36 50 38 C54 36 60 32 66 36 C68 42 62 46 50 46 C38 46 32 42 34 36 Z" fill="#881337" stroke="#fda4af" strokeWidth="1.5" />
          <circle cx="42" cy="40" r="2" fill="#fff" />
          <circle cx="58" cy="40" r="2" fill="#fff" />
          {/* Rose in lips / hair */}
          <circle cx="64" cy="26" r="6" fill="#e11d48" stroke="#fb7185" strokeWidth="1.2" />
          <path d="M64 26 C62 24 62 28 66 28 C66 24 64 24 64 26 Z" fill="#be123c" />
          {/* Stiletto Dagger */}
          <line x1="28" y1="78" x2="42" y2="64" stroke="#fda4af" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="24" y1="82" x2="28" y2="78" stroke="#e11d48" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'joker':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#14061a" stroke="#d946ef" strokeWidth="2.5" />
          {/* Jester Hat */}
          <path d="M30 40 C20 30 16 16 32 20 C42 22 40 38 40 38" fill="#701a75" stroke="#f472b6" strokeWidth="1.5" />
          <path d="M70 40 C80 30 84 16 68 20 C58 22 60 38 60 38" fill="#581c87" stroke="#c084fc" strokeWidth="1.5" />
          <path d="M40 38 C46 22 54 22 60 38 Z" fill="#be185d" stroke="#f43f5e" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="3.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="80" cy="20" r="3.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
          {/* Sinister Grinning Face */}
          <circle cx="50" cy="54" r="20" fill="#2e1065" stroke="#e879f9" strokeWidth="1.8" />
          {/* Playing Card Diamonds/Eyes */}
          <path d="M42 46 L45 50 L42 54 L39 50 Z" fill="#f43f5e" />
          <path d="M58 46 L61 50 L58 54 L55 50 Z" fill="#d946ef" />
          {/* Evil Wide Grin */}
          <path d="M36 60 C42 74 58 74 64 60 C58 66 42 66 36 60 Z" fill="#881337" stroke="#f43f5e" strokeWidth="1.8" />
          {/* Sharp Teeth */}
          <path d="M40 62 L42 66 L44 62 L46 66 L48 62 L50 66 L52 62 L54 66 L56 62 L58 66 L60 62" stroke="#ffffff" strokeWidth="1.2" />
        </svg>
      );

    case 'simple_mafia':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#14080a" stroke="#f43f5e" strokeWidth="2.5" />
          {/* Classic Fedorad Guy */}
          <ellipse cx="50" cy="40" rx="32" ry="6" fill="#3f131a" stroke="#e11d48" strokeWidth="1.5" />
          <path d="M30 39 C31 24 38 20 50 20 C62 20 69 24 70 39 Z" fill="#260b10" stroke="#f43f5e" strokeWidth="1.5" />
          <rect x="32" y="37" width="36" height="4" fill="#e11d48" />
          {/* Dark Shades */}
          <path d="M34 48 L46 48 L44 57 L36 57 Z" fill="#09090b" stroke="#e11d48" strokeWidth="1.4" />
          <path d="M54 48 L66 48 L64 57 L56 57 Z" fill="#09090b" stroke="#e11d48" strokeWidth="1.4" />
          <line x1="46" y1="51" x2="54" y2="51" stroke="#e11d48" strokeWidth="1.5" />
          {/* Trenchcoat collar & tie */}
          <path d="M36 68 L50 86 L64 68 Z" fill="#4c0519" stroke="#fb7185" strokeWidth="1.5" />
          <polygon points="50,68 47,74 50,84 53,74" fill="#e11d48" />
        </svg>
      );

    case 'detective':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#031b26" stroke="#0ea5e9" strokeWidth="2.5" />
          {/* Magnifying Glass with glowing fingerprint */}
          <circle cx="44" cy="42" r="22" fill="#082f49" stroke="#38bdf8" strokeWidth="3" />
          {/* Fingerprint ridges inside */}
          <path d="M44 32 C38 32 34 36 34 42 C34 48 38 52 44 52 C50 52 54 48 54 42" stroke="#0ea5e9" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M44 28 C36 28 30 34 30 42 C30 50 36 56 44 56 C52 56 58 50 58 42" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="44" cy="42" r="3" fill="#7dd3fc" />
          {/* Magnifier Handle */}
          <line x1="60" y1="58" x2="78" y2="76" stroke="#e0f2fe" strokeWidth="6" strokeLinecap="round" />
          <line x1="62" y1="60" x2="76" y2="74" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
          {/* Detective Hat small crest on top right */}
          <path d="M68 20 C72 20 78 24 82 24 C84 24 86 28 84 30 L66 30 Z" fill="#0369a1" />
        </svg>
      );

    case 'doctor':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#04201e" stroke="#10b981" strokeWidth="2.5" />
          {/* Shield of protection */}
          <path d="M50 18 C64 18 76 26 76 42 C76 64 50 80 50 80 C50 80 24 64 24 42 C24 26 36 18 50 18 Z" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
          {/* Medical Cross (Green/Cyan) */}
          <rect x="44" y="32" width="12" height="32" rx="3" fill="#ecfdf5" stroke="#059669" strokeWidth="1" />
          <rect x="34" y="42" width="32" height="12" rx="3" fill="#ecfdf5" stroke="#059669" strokeWidth="1" />
          {/* Stethoscope loop around */}
          <path d="M30 40 C28 58 40 70 50 70 C60 70 72 58 70 40" stroke="#6ee7b7" strokeWidth="2" strokeDasharray="3 3" fill="none" />
        </svg>
      );

    case 'sniper':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#021a1f" stroke="#06b6d4" strokeWidth="2.5" />
          {/* Tactical Crosshair Scope */}
          <circle cx="50" cy="50" r="32" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 2" />
          <circle cx="50" cy="50" r="22" stroke="#06b6d4" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="8" stroke="#67e8f9" strokeWidth="1.8" />
          <circle cx="50" cy="50" r="2.5" fill="#f43f5e" />
          {/* Crosshair lines */}
          <line x1="12" y1="50" x2="42" y2="50" stroke="#22d3ee" strokeWidth="2" />
          <line x1="58" y1="50" x2="88" y2="50" stroke="#22d3ee" strokeWidth="2" />
          <line x1="50" y1="12" x2="50" y2="42" stroke="#22d3ee" strokeWidth="2" />
          <line x1="50" y1="58" x2="50" y2="88" stroke="#22d3ee" strokeWidth="2" />
          {/* Range finder hash marks */}
          <line x1="32" y1="46" x2="32" y2="54" stroke="#67e8f9" strokeWidth="1.5" />
          <line x1="68" y1="46" x2="68" y2="54" stroke="#67e8f9" strokeWidth="1.5" />
          <line x1="46" y1="32" x2="54" y2="32" stroke="#67e8f9" strokeWidth="1.5" />
          <line x1="46" y1="68" x2="54" y2="68" stroke="#67e8f9" strokeWidth="1.5" />
        </svg>
      );

    case 'armored':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#0f172a" stroke="#64748b" strokeWidth="2.5" />
          {/* Ballistic Body Armor Vest */}
          <path d="M30 24 L42 20 L58 20 L70 24 L76 46 L70 52 L72 80 L28 80 L30 52 L24 46 Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.2" />
          {/* Reinforced Ceramic Plate */}
          <rect x="36" y="38" width="28" height="32" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.8" />
          {/* Armor Star Insignia */}
          <polygon points="50,44 52.5,50 59,50 54,54 56,60 50,56 44,60 46,54 41,50 47.5,50" fill="#38bdf8" />
          {/* Shoulder Straps */}
          <rect x="32" y="24" width="10" height="12" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
          <rect x="58" y="24" width="10" height="12" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
        </svg>
      );

    case 'gunsmith':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#181308" stroke="#f59e0b" strokeWidth="2.5" />
          {/* Two Crossed Revolvers */}
          <g transform="rotate(45 50 50)">
            <rect x="46" y="20" width="8" height="50" rx="2" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
            <rect x="42" y="44" width="16" height="12" rx="2" fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M46 70 L42 82 L50 84 L54 70 Z" fill="#b45309" stroke="#fde68a" strokeWidth="1.2" />
          </g>
          <g transform="rotate(-45 50 50)">
            <rect x="46" y="20" width="8" height="50" rx="2" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
            <rect x="42" y="44" width="16" height="12" rx="2" fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M46 70 L42 82 L50 84 L54 70 Z" fill="#b45309" stroke="#fde68a" strokeWidth="1.2" />
          </g>
          {/* Bullets array at bottom */}
          <rect x="36" y="76" width="6" height="12" rx="2" fill="#facc15" stroke="#78350f" strokeWidth="0.8" />
          <rect x="47" y="74" width="6" height="14" rx="2" fill="#facc15" stroke="#78350f" strokeWidth="0.8" />
          <rect x="58" y="76" width="6" height="12" rx="2" fill="#facc15" stroke="#78350f" strokeWidth="0.8" />
        </svg>
      );

    case 'judge':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#17120a" stroke="#eab308" strokeWidth="2.5" />
          {/* Gavel & Scales of Law */}
          {/* Scales beam */}
          <line x1="24" y1="36" x2="76" y2="36" stroke="#ca8a04" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="36" r="4" fill="#facc15" />
          <line x1="50" y1="36" x2="50" y2="78" stroke="#ca8a04" strokeWidth="3" />
          {/* Scale pans */}
          <path d="M20 54 C20 58 32 58 32 54 Z" fill="#ca8a04" stroke="#facc15" strokeWidth="1" />
          <line x1="24" y1="36" x2="20" y2="54" stroke="#eab308" strokeWidth="1.2" />
          <line x1="24" y1="36" x2="32" y2="54" stroke="#eab308" strokeWidth="1.2" />
          <path d="M68 54 C68 58 80 58 80 54 Z" fill="#ca8a04" stroke="#facc15" strokeWidth="1" />
          <line x1="76" y1="36" x2="68" y2="54" stroke="#eab308" strokeWidth="1.2" />
          <line x1="76" y1="36" x2="80" y2="54" stroke="#eab308" strokeWidth="1.2" />
          {/* Judge Gavel striking */}
          <g transform="rotate(-30 45 40)">
            <rect x="36" y="24" width="22" height="10" rx="2" fill="#854d0e" stroke="#fef08a" strokeWidth="1.5" />
            <rect x="44" y="34" width="6" height="34" rx="2" fill="#a16207" stroke="#fde047" strokeWidth="1.2" />
          </g>
          {/* Sound Block */}
          <ellipse cx="50" cy="80" rx="26" ry="6" fill="#713f12" stroke="#fde047" strokeWidth="1.5" />
        </svg>
      );

    case 'priest':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#081d28" stroke="#38bdf8" strokeWidth="2.5" />
          {/* Holy Cross & Radiant Rays */}
          <circle cx="50" cy="38" r="24" stroke="#7dd3fc" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
          {/* Radiant Halo */}
          <line x1="50" y1="8" x2="50" y2="14" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
          <line x1="28" y1="18" x2="32" y2="22" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
          <line x1="72" y1="18" x2="68" y2="22" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
          {/* Holy Cross */}
          <rect x="45" y="22" width="10" height="52" rx="2" fill="#0284c7" stroke="#e0f2fe" strokeWidth="2" />
          <rect x="28" y="34" width="44" height="10" rx="2" fill="#0284c7" stroke="#e0f2fe" strokeWidth="2" />
          <circle cx="50" cy="39" r="4" fill="#facc15" />
          {/* Sacred Robe collar */}
          <path d="M30 84 C38 74 62 74 70 84 Z" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="47" y="78" width="6" height="6" fill="#ffffff" />
        </svg>
      );

    case 'sacrificial':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#200d08" stroke="#f97316" strokeWidth="2.5" />
          {/* Flaming Heart of Bravery */}
          <path d="M50 36 C42 22 24 26 24 44 C24 64 50 78 50 78 C50 78 76 64 76 44 C76 26 58 22 50 36 Z" fill="#9a3412" stroke="#fdba74" strokeWidth="2" />
          {/* Flames Rising from Heart */}
          <path d="M50 20 C46 26 44 32 50 36 C56 32 54 26 50 20 Z" fill="#fbbf24" />
          <path d="M42 26 C38 32 40 36 44 38 C42 34 44 30 42 26 Z" fill="#ea580c" />
          <path d="M58 26 C62 32 60 36 56 38 C58 34 56 30 58 26 Z" fill="#ea580c" />
          {/* Protective Heroic Wings */}
          <path d="M16 52 C22 46 28 50 32 54" stroke="#fdba74" strokeWidth="2" strokeLinecap="round" />
          <path d="M84 52 C78 46 72 50 68 54" stroke="#fdba74" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'freemason':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#081a24" stroke="#0284c7" strokeWidth="2.5" />
          {/* Mason Triangle with All-Seeing Eye (مثلث چشم بینا) */}
          <polygon points="50,18 82,74 18,74" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="2.5" />
          {/* Compass and Square */}
          <path d="M36 74 L50 44 L64 74" stroke="#facc15" strokeWidth="2" />
          {/* The Eye of Providence */}
          <ellipse cx="50" cy="52" rx="14" ry="8" fill="#075985" stroke="#bae6fd" strokeWidth="1.8" />
          <circle cx="50" cy="52" r="5" fill="#facc15" />
          <circle cx="50" cy="52" r="2.5" fill="#0284c7" />
          {/* Rays of enlightenment */}
          <line x1="50" y1="12" x2="50" y2="6" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
          <line x1="68" y1="26" x2="73" y2="21" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="26" x2="27" y2="21" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    
    case 'hacker':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#021c16" stroke="#10b981" strokeWidth="2.5" />
          {/* Cyber Terminal & Hooded Elite */}
          <path d="M28 66 C28 42 36 28 50 28 C64 28 72 42 72 66 Z" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
          {/* Neon Binary Goggles */}
          <rect x="36" y="46" width="28" height="10" rx="3" fill="#022c22" stroke="#10b981" strokeWidth="1.5" />
          <text x="43" y="54" fill="#34d399" fontSize="7" fontFamily="monospace">01</text>
          <text x="53" y="54" fill="#34d399" fontSize="7" fontFamily="monospace">10</text>
          {/* Laptop keyboard with glowing matrix code */}
          <polygon points="26,80 74,80 66,70 34,70" fill="#042f2e" stroke="#10b981" strokeWidth="1.5" />
          <line x1="38" y1="74" x2="62" y2="74" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'simple_citizen':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#081826" stroke="#38bdf8" strokeWidth="2.5" />
          {/* City Skyline & Citizen Silhouette */}
          <rect x="22" y="48" width="14" height="32" fill="#0f2b46" stroke="#38bdf8" strokeWidth="1" />
          <rect x="40" y="38" width="18" height="42" fill="#075985" stroke="#38bdf8" strokeWidth="1.2" />
          <rect x="62" y="44" width="16" height="36" fill="#0f2b46" stroke="#38bdf8" strokeWidth="1" />
          {/* City Windows Glowing */}
          <rect x="44" y="44" width="3" height="4" fill="#fde047" />
          <rect x="50" y="44" width="3" height="4" fill="#fde047" />
          <rect x="44" y="52" width="3" height="4" fill="#fde047" />
          <rect x="50" y="52" width="3" height="4" fill="#fde047" />
          <rect x="26" y="56" width="3" height="4" fill="#fde047" />
          <rect x="66" y="56" width="3" height="4" fill="#fde047" />
          {/* Streetlamp casting light */}
          <path d="M50 16 L50 36 M44 20 L56 20" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="50" cy="20" r="3" fill="#fef08a" />
          <path d="M42 24 L50 32 L58 24 Z" fill="#fde047" opacity="0.3" />
        </svg>
      );

    case 'nostradamus':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#180e28" stroke="#a855f7" strokeWidth="2.5" />
          {/* Mystical Crystal Ball on Pedestal */}
          <ellipse cx="50" cy="78" rx="20" ry="6" fill="#3b0764" stroke="#c084fc" strokeWidth="1.5" />
          <path d="M42 74 L46 64 L54 64 L58 74 Z" fill="#581c87" stroke="#e879f9" strokeWidth="1.2" />
          {/* Glowing Orb */}
          <circle cx="50" cy="44" r="22" fill="#2e1065" stroke="#d946ef" strokeWidth="2.5" />
          <circle cx="44" cy="38" r="16" fill="#701a75" opacity="0.5" />
          {/* Zodiac Celestial Stars & Third Eye inside Orb */}
          <polygon points="50,34 52,40 58,40 53,44 55,50 50,46 45,50 47,44 42,40 48,40" fill="#facc15" />
          <circle cx="50" cy="43" r="2.5" fill="#f43f5e" />
          {/* Mystical Fog Wisps */}
          <path d="M32 44 C36 40 42 46 46 42" stroke="#e879f9" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          <path d="M54 44 C58 40 64 46 68 42" stroke="#e879f9" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        </svg>
      );

    case 'thousand_faces':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#171226" stroke="#8b5cf6" strokeWidth="2.5" />
          {/* Dual Theater Masks (Comedy & Tragedy) Fractured */}
          {/* Tragedy Mask (Left) */}
          <path d="M46 24 C30 24 22 36 22 52 C22 66 32 76 46 76 Z" fill="#2e1065" stroke="#a78bfa" strokeWidth="1.8" />
          <circle cx="34" cy="42" r="3" fill="#0f021f" stroke="#c4b5fd" strokeWidth="1" />
          <path d="M28 58 C32 52 40 52 44 58" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Comedy Mask (Right) */}
          <path d="M54 24 C70 24 78 36 78 52 C78 66 68 76 54 76 Z" fill="#431407" stroke="#fb923c" strokeWidth="1.8" />
          <circle cx="66" cy="42" r="3" fill="#1c0702" stroke="#fed7aa" strokeWidth="1" />
          <path d="M56 54 C60 62 68 62 72 54" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Central Fracture Line */}
          <line x1="50" y1="20" x2="50" y2="80" stroke="#facc15" strokeWidth="2" strokeDasharray="3 2" />
        </svg>
      );

    
    case 'negotiator':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#170308" stroke="#e11d48" strokeWidth="2.5" />
          <rect x="26" y="38" width="48" height="34" rx="4" fill="#310b17" stroke="#fb7185" strokeWidth="1.8" />
          <path d="M40 38 V30 C40 26 60 26 60 30 V38" stroke="#fb7185" strokeWidth="2" fill="none" />
          <line x1="26" y1="52" x2="74" y2="52" stroke="#e11d48" strokeWidth="1.5" />
          <rect x="46" y="49" width="8" height="6" rx="1" fill="#facc15" />
          <circle cx="36" cy="62" r="3" fill="#fb7185" />
          <circle cx="64" cy="62" r="3" fill="#fb7185" />
        </svg>
      );

    case 'thief':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#140207" stroke="#e11d48" strokeWidth="2.5" />
          <ellipse cx="50" cy="46" rx="28" ry="16" fill="#2d0611" stroke="#f43f5e" strokeWidth="1.8" />
          <ellipse cx="38" cy="46" rx="7" ry="5" fill="#09090b" stroke="#fb7185" strokeWidth="1.2" />
          <ellipse cx="62" cy="46" rx="7" ry="5" fill="#09090b" stroke="#fb7185" strokeWidth="1.2" />
          <circle cx="38" cy="46" r="2.5" fill="#ef4444" />
          <circle cx="62" cy="46" r="2.5" fill="#ef4444" />
          <path d="M42 68 C42 64 58 64 58 68 L60 78 H40 Z" fill="#4c0519" stroke="#fb7185" strokeWidth="1.2" />
          <path d="M30 78 L24 84 M70 78 L76 84" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'bomber':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#1c0407" stroke="#e11d48" strokeWidth="2.5" />
          <rect x="28" y="44" width="12" height="36" rx="2" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.5" />
          <rect x="44" y="44" width="12" height="36" rx="2" fill="#991b1b" stroke="#f87171" strokeWidth="1.5" />
          <rect x="60" y="44" width="12" height="36" rx="2" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.5" />
          <rect x="24" y="58" width="52" height="6" fill="#1e1b4b" stroke="#e11d48" strokeWidth="1" />
          <path d="M50 44 C50 32 66 36 68 24" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          <circle cx="69" cy="23" r="3" fill="#ef4444" />
          <polygon points="69,18 71,22 75,23 72,26 73,30 69,27 65,30 66,26 63,23 67,22" fill="#f59e0b" />
        </svg>
      );

    case 'hostage_taker':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#18040a" stroke="#e11d48" strokeWidth="2.5" />
          <circle cx="50" cy="40" r="16" fill="#2d0611" stroke="#f43f5e" strokeWidth="1.5" />
          <ellipse cx="50" cy="44" rx="14" ry="4" fill="#09090b" stroke="#fb7185" strokeWidth="1.5" />
          <path d="M30 74 C30 60 70 60 70 74" stroke="#fb7185" strokeWidth="2" fill="none" />
          <ellipse cx="50" cy="68" rx="22" ry="5" stroke="#facc15" strokeWidth="2.5" strokeDasharray="4 2" fill="none" />
          <ellipse cx="50" cy="74" rx="20" ry="5" stroke="#facc15" strokeWidth="2.5" strokeDasharray="4 2" fill="none" />
        </svg>
      );

    case 'informant_mafia':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#160207" stroke="#e11d48" strokeWidth="2.5" />
          <rect x="42" y="24" width="16" height="28" rx="8" fill="#310b17" stroke="#f43f5e" strokeWidth="1.8" />
          <line x1="42" y1="36" x2="58" y2="36" stroke="#fb7185" strokeWidth="1" />
          <path d="M34 38 C34 52 66 52 66 38" stroke="#fb7185" strokeWidth="2" fill="none" />
          <line x1="50" y1="52" x2="50" y2="68" stroke="#fb7185" strokeWidth="2" />
          <line x1="36" y1="68" x2="64" y2="68" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M72 28 C76 34 76 44 72 50" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <path d="M78 22 C84 32 84 50 78 60" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'infiltrator':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#150209" stroke="#e11d48" strokeWidth="2.5" />
          <path d="M30 30 L50 18 L70 30 V50 C70 66 50 78 50 78 C50 78 30 66 30 50 Z" fill="#2d0611" stroke="#f43f5e" strokeWidth="1.8" />
          <path d="M50 28 L50 64" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M42 42 L58 42" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="68" r="2.5" fill="#ef4444" />
        </svg>
      );

    case 'shadow_mafia':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#0d0105" stroke="#be123c" strokeWidth="2.5" />
          <path d="M28 78 C28 48 38 24 50 24 C62 24 72 48 72 78 C64 72 58 76 50 72 C42 76 36 72 28 78 Z" fill="#20040b" stroke="#f43f5e" strokeWidth="1.8" />
          <circle cx="42" cy="44" r="3.5" fill="#f43f5e" />
          <circle cx="58" cy="44" r="3.5" fill="#f43f5e" />
        </svg>
      );

    case 'bodyguard':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#041326" stroke="#0284c7" strokeWidth="2.5" />
          <path d="M26 30 L50 20 L74 30 V54 C74 70 50 82 50 82 C50 82 26 70 26 54 Z" fill="#0c2d48" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="50" cy="44" r="10" fill="#075985" stroke="#7dd3fc" strokeWidth="1.5" />
          <path d="M38 66 C38 56 62 56 62 66" stroke="#7dd3fc" strokeWidth="2" fill="none" />
        </svg>
      );

    
    
    case 'watcher':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#031627" stroke="#0284c7" strokeWidth="2.5" />
          <path d="M20 50 C30 32 70 32 80 50 C70 68 30 68 20 50 Z" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="50" cy="50" r="12" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="6" fill="#082f49" />
          <circle cx="47" cy="47" r="2.5" fill="#ffffff" />
        </svg>
      );

    case 'journalist':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#04172a" stroke="#0284c7" strokeWidth="2.5" />
          <rect x="24" y="36" width="52" height="36" rx="6" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="50" cy="54" r="11" fill="#031627" stroke="#7dd3fc" strokeWidth="1.8" />
          <circle cx="50" cy="54" r="5" fill="#38bdf8" />
          <rect x="34" y="28" width="14" height="8" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
          <circle cx="64" cy="44" r="3" fill="#facc15" />
        </svg>
      );

    case 'independent_jester':
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#160826" stroke="#9333ea" strokeWidth="2.5" />
          <path d="M30 52 C24 34 38 24 44 34 C48 22 62 26 58 38 C68 28 80 40 70 52 Z" fill="#581c87" stroke="#c084fc" strokeWidth="1.8" />
          <circle cx="28" cy="48" r="3" fill="#facc15" />
          <circle cx="52" cy="24" r="3" fill="#facc15" />
          <circle cx="74" cy="50" r="3" fill="#facc15" />
          <circle cx="50" cy="58" r="14" fill="#3b0764" stroke="#a855f7" strokeWidth="1.5" />
          <path d="M42 64 C46 70 54 70 58 64" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} width={size} height={size}>
          <circle cx="50" cy="50" r="46" fill="#18181b" stroke="#71717a" strokeWidth="2" />
          <text x="50" y="58" textAnchor="middle" fill="#d4d4d8" fontSize="24" fontWeight="bold">؟</text>
        </svg>
      );
  }
};


export const RoleIcon: React.FC<IconProps & { roleId: string }> = ({ roleId, className = 'w-full h-full', size = 64 }) => {
  const [imgError, setImgError] = React.useState(false);
  const normalizedId = (roleId || '').toLowerCase().trim();

  if (!imgError && normalizedId) {
    return (
      <img
        src={`/cards/${normalizedId}.jpeg`}
        alt={roleId}
        className={`${className} object-cover rounded-xl shadow-md transition-transform duration-200 hover:scale-105`}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    );
  }

  return <FallbackSvgIcon roleId={roleId} className={className} size={size} />;
};
