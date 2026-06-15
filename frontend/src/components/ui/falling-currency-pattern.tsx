import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const CURRENCIES = [
  { symbol: "$",  color: "#34d399" }, // emerald — dollar rising
  { symbol: "₹",  color: "#f87171" }, // red — rupee falling
  { symbol: "€",  color: "#60a5fa" }, // blue — euro
  { symbol: "¥",  color: "#a78bfa" }, // violet — yen
  { symbol: "£",  color: "#fb923c" }, // orange — pound
  { symbol: "₿",  color: "#facc15" }, // gold — bitcoin
  { symbol: "$",  color: "#f87171" }, // red dollar falling
  { symbol: "₹",  color: "#34d399" }, // green rupee rising
];

interface CurrencyElement {
  id: number;
  symbol: string;
  color: string;
  x: number;
  startY: number;
  duration: number;
  delay: number;
  direction: 1 | -1;
  fontSize: number;
  opacity: number;
}

export function FallingCurrencyPattern() {
  const [elements, setElements] = useState<CurrencyElement[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 50 }).map((_, i) => {
      const curr = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
      return {
        id: i,
        symbol: curr.symbol,
        color: curr.color,
        x: Math.random() * 100,
        startY: Math.random() * 100,
        duration: Math.random() * 20 + 15, // 15–35s
        delay: -(Math.random() * 20),      // already mid-animation on load
        direction: (Math.random() > 0.5 ? 1 : -1) as 1 | -1,
        fontSize: Math.random() * 1.8 + 1.2, // 1.2–3rem
        opacity: Math.random() * 0.12 + 0.06, // 0.06–0.18 (very subtle)
      };
    });
    setElements(generated);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {elements.map((el) => {
        const yOffset = el.direction === 1 ? "80vh" : "-80vh";
        return (
          <motion.div
            key={el.id}
            style={{
              position: "absolute",
              left: `${el.x}vw`,
              top: `${el.startY}vh`,
              fontSize: `${el.fontSize}rem`,
              fontWeight: 900,
              color: el.color,
              fontFamily: "'Space Grotesk', 'Inter', sans-serif",
              lineHeight: 1,
            }}
            initial={{ y: 0, opacity: 0 }}
            animate={{
              y: ["0vh", yOffset],
              opacity: [0, el.opacity, el.opacity, 0],
            }}
            transition={{
              duration: el.duration,
              delay: el.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {el.symbol}
          </motion.div>
        );
      })}
    </div>
  );
}
