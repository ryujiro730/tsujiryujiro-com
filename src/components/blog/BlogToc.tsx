"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

type TocItem = {
  id: string;
  text: string;
  level: number;
};

export default function BlogToc() {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll("article h2")
    ) as HTMLHeadingElement[];

    const list = headings.map((h) => {
      let id = h.id;
      if (!id) {
        id = h.innerText
          .trim()
          .toLowerCase()
          .replace(/[。\s・、]/g, "-")
          .replace(/[^a-z0-9\-ぁ-んァ-ン一-龥]/g, "");
        h.id = id;
      }
      return { id, text: h.innerText, level: 2 };
    });

    setToc(list);
  }, []);

  if (toc.length === 0) return null;

  return (
    <div className="not-prose my-6 w-full">
      <div className="w-full rounded-xl border border-slate-200/80 bg-slate-50/70 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100/60 transition-colors"
          aria-expanded={open}
        >
          <span>目次</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="border-t border-slate-200/60 px-4 pb-4 pt-2">
            <ul className="space-y-2 border-l-2 border-slate-300/80 pl-4">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block font-medium text-slate-700 hover:text-slate-900 hover:underline underline-offset-4 transition"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
