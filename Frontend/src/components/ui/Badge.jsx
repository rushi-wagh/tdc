const variants = {
  neutral: "border-[#e7d8cf] bg-ivory text-muted",
  burgundy: "border-burgundy/10 bg-blush text-burgundy",
  gold: "border-gold/20 bg-gold/10 text-[#7a5521]",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  red: "border-rose-200 bg-rose-50 text-rose-700",
};

const Badge = ({ children, variant = "neutral" }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${variants[variant] || variants.neutral}`}>
    {children}
  </span>
);

export default Badge;
