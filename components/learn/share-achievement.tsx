"use client";

import { useMemo, useState } from "react";
import { FaLinkedin, FaXTwitter } from "react-icons/fa6";
import { FiCheck, FiCopy, FiShare2 } from "react-icons/fi";

type ShareAchievementProps = {
  badgeName: string;
  questTitle: string;
  service: string;
  topics?: string[];
  dark?: boolean;
};

export function ShareAchievement({ badgeName, questTitle, service, topics = [], dark = false }: ShareAchievementProps) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : window.location.href;
  const text = useMemo(() => {
    const skills = topics.length ? ` I practiced ${topics.slice(0, 3).join(", ")}.` : "";
    return `I earned the ${badgeName} by completing “${questTitle}” in the ${service} track on ServerlessCreed.${skills} Learning cloud by building—one Pokémon quest at a time. #ServerlessCreed #AWS #CloudLearning`;
  }, [badgeName, questTitle, service, topics]);
  const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(`${text}\n\n${url}`)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const base = dark
    ? "border-white/[0.15] bg-white/[0.05] text-white hover:bg-white/[0.1]"
    : "border-black/[0.1] bg-white text-[#171717] hover:bg-black/[.04]";

  const copy = async () => {
    await navigator.clipboard.writeText(`${text}\n\n${url}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const nativeShare = async () => {
    if (navigator.share) await navigator.share({ title: `${badgeName} · ServerlessCreed`, text, url });
    else await copy();
  };

  return (
    <div className={dark ? "text-white" : "text-[#171717]"}>
      <p className={`text-xs font-semibold uppercase tracking-[.14em] ${dark ? "text-white/[0.45]" : "text-black/[0.4]"}`}>Share your badge</p>
      <p className={`mt-2 text-sm leading-6 ${dark ? "text-white/[0.6]" : "text-black/[0.55]"}`}>Show what you built with {service} and invite another trainer to ServerlessCreed.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={nativeShare} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${base}`}><FiShare2 /> Share</button>
        <a href={xUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${base}`}><FaXTwitter /> X</a>
        <a href={linkedInUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${base}`}><FaLinkedin /> LinkedIn</a>
        <button type="button" onClick={copy} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${base}`}>{copied ? <FiCheck /> : <FiCopy />}{copied ? "Copied" : "Copy"}</button>
      </div>
    </div>
  );
}
