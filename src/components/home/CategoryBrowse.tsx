"use client";

import Link from "next/link";

const categories = [
  { name: "Haircut", icon: "✂️", color: "from-purple-500/20 to-violet-500/20 border-purple-500/30" },
  { name: "Facial", icon: "✨", color: "from-pink-500/20 to-rose-500/20 border-pink-500/30" },
  { name: "Makeup", icon: "💄", color: "from-red-500/20 to-pink-500/20 border-red-500/30" },
  { name: "Spa", icon: "🛁", color: "from-teal-500/20 to-emerald-500/20 border-teal-500/30" },
  { name: "Nail Art", icon: "💅", color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30" },
  { name: "Hair Color", icon: "🎨", color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30" },
  { name: "Bridal", icon: "👰", color: "from-rose-500/20 to-pink-500/20 border-rose-500/30" },
  { name: "Massage", icon: "🧘", color: "from-green-500/20 to-emerald-500/20 border-green-500/30" },
];

export default function CategoryBrowse() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">
          Browse by <span className="gradient-text">Service</span>
        </h2>
        <p className="text-white/50">Find the perfect treatment for any occasion</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.name}
            href={`/salons?service=${encodeURIComponent(cat.name)}`}
            className={`glass-card p-4 text-center group border bg-gradient-to-b ${cat.color} hover:scale-105 transition-all duration-300`}
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">
              {cat.icon}
            </div>
            <p className="text-sm font-semibold text-white/90 mb-1">{cat.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
