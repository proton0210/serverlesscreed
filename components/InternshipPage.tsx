"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const tracks = [
  {
    name: "Buckets by ServerlessCreed",
    shortName: "Buckets",
    label: "Amazon S3 track",
    image: "/serverless-buckets.png",
    accent: "bg-amber-300",
    copy: "Explore real-world S3 workflows, evaluate product features, and turn what you learn into practical content for developers.",
    requirement: "An AWS account and hands-on familiarity with Amazon S3",
    applicationUrl: "https://buckets.serverlesscreed.com/internship",
  },
  {
    name: "Tables by Serverless Creed",
    shortName: "Tables",
    label: "DynamoDB track",
    image: "/serverless-tables.png",
    accent: "bg-lime-300",
    copy: "Explore table, item, query, and automation workflows, then turn your findings into practical content for developers.",
    requirement: "An AWS account and hands-on familiarity with Amazon DynamoDB",
    applicationUrl: "https://tables.serverlesscreed.com/internship",
  },
];

const workflow = [
  {
    title: "Explore",
    copy: "Build a working understanding of the product and the problem it solves.",
    tasks: [
      "Study the handbook and product manual",
      "Connect features to real developer pain points",
      "Select useful workflows worth demonstrating",
    ],
  },
  {
    title: "Test",
    copy: "Validate each workflow in your own AWS environment before writing about it.",
    tasks: [
      "Reproduce the workflow from start to finish",
      "Record prerequisites, decisions, and edge cases",
      "Capture accurate examples and screenshots",
    ],
  },
  {
    title: "Explain",
    copy: "Turn your findings into guidance that is technically accurate and easy to follow.",
    tasks: [
      "Define the reader, problem, and outcome",
      "Write a clear, step-by-step narrative",
      "Explain why the feature is useful—not only how it works",
    ],
  },
  {
    title: "Publish",
    copy: "Shape the draft into a polished article that developers can confidently use.",
    tasks: [
      "Edit for accuracy, structure, and clarity",
      "Add supporting visuals or code where helpful",
      "Incorporate feedback and prepare the final post",
    ],
  },
];

export default function InternshipPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f5ef] text-zinc-950">
      <header className="border-b-2 border-zinc-950 bg-[#f7f5ef]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Serverless Creed home" className="flex items-center gap-3.5 text-sm font-black uppercase tracking-[0.18em]">
            <span className="relative h-10 w-[52px] shrink-0 overflow-hidden" aria-hidden="true">
              <Image src="/logo.jpeg" alt="" width={105} height={105} className="absolute -left-[27px] -top-[21px] h-[105px] w-[105px] max-w-none mix-blend-multiply" priority />
            </span>
            <span className="hidden sm:inline">Serverless Creed</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="hidden text-xs font-black uppercase tracking-wider underline-offset-4 hover:underline sm:block">
              Products
            </Link>
            <a
              href="mailto:vidit@serverlesscreed.com?subject=Website%20enquiry%20for%20the%20founder"
              aria-label="Email the founder"
              title="Email the founder"
              className="grid h-10 w-10 shrink-0 place-items-center border-2 border-zinc-950 bg-white shadow-[3px_3px_0_#18181b] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="1" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </a>
            <a href="#tracks" className="border-2 border-zinc-950 bg-zinc-950 px-4 py-2 text-xs font-black uppercase tracking-wider text-white">
              View tracks
            </a>
          </div>
        </div>
      </header>

      <section className="relative border-b-2 border-zinc-950">
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#18181b_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_360px] lg:items-start lg:py-24">
          <motion.div initial={{ opacity: 1, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
            <motion.span initial={{ rotate: -6, scale: 0.9 }} animate={{ rotate: -2, scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="inline-flex border-2 border-zinc-950 bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] shadow-[3px_3px_0_#18181b]">
              Applications open
            </motion.span>
            <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-[4.5rem] xl:text-[5.25rem]">
              Learn it inside out.
              <br />
              <span className="text-zinc-500">Explain it clearly.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-700 sm:text-xl">
              Spend three months building deep expertise in a focused AWS product—from core concepts and real-world workflows to edge cases and best practices. Master the subject, then turn that knowledge into practical content developers can trust.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a href="#tracks" className="border-2 border-zinc-950 bg-white px-6 py-3 text-sm font-black uppercase tracking-wider shadow-[5px_5px_0_#18181b] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                Choose a track ↓
              </a>
              <a href="#workflow" className="px-3 py-3 text-sm font-black uppercase tracking-wider underline decoration-2 underline-offset-4">
                See the work
              </a>
            </div>
          </motion.div>

          <motion.aside initial={{ opacity: 1, x: 34 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.6 }} className="border-2 border-zinc-950 bg-white shadow-[8px_8px_0_#18181b] lg:sticky lg:top-6">
            <div className="border-b-2 border-zinc-950 bg-zinc-950 p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">At a glance</p>
              <p className="mt-2 text-2xl font-black">The commitment</p>
            </div>
            <dl className="divide-y-2 divide-zinc-950">
              {[["Format", "Fully remote"], ["Duration", "3 months"], ["Schedule", "Monday–Friday"], ["Daily commitment", "1–2 hours"], ["Stipend", "₹5,000/month"], ["Application deadline", "31st July 2026"]].map(([term, value]) => (
                <div key={term} className="flex items-center justify-between gap-5 p-5">
                  <dt className="text-xs font-bold uppercase tracking-wider text-zinc-500">{term}</dt>
                  <dd className="text-right font-black">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="bg-lime-300 p-5">
              <p className="text-xs font-black uppercase tracking-wider">Plus a tools allowance</p>
              <p className="mt-1 font-black">OpenAI plan worth US$20/month</p>
              <p className="mt-1 text-xs font-bold text-zinc-700">Provided in addition to the stipend.</p>
            </div>
          </motion.aside>
        </div>
      </section>

      <section id="tracks" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-4xl font-black tracking-tight sm:text-6xl">Choose your track.</h2>
        </div>
        <div className="grid gap-7 lg:grid-cols-2">
          {tracks.map((track, index) => (
            <motion.article key={track.name} initial={{ opacity: 1, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: index * 0.1, duration: 0.55 }} className="group flex min-h-[590px] flex-col border-2 border-zinc-950 bg-white p-6 shadow-[8px_8px_0_#18181b] sm:p-8">
              <div className="flex items-start justify-between gap-6">
                <span className="font-mono text-xs font-bold text-zinc-500">TRACK / 0{index + 1}</span>
                <motion.div whileHover={{ rotate: 6, scale: 1.06 }} className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.35rem] border-2 border-zinc-950 bg-gradient-to-br from-white to-[#fff0dc] shadow-[4px_4px_0_#18181b] sm:h-24 sm:w-24 sm:rounded-[1.6rem]">
                  <Image src={track.image} alt={`${track.name} official logo`} width={96} height={96} className="h-full w-full object-contain p-1" />
                </motion.div>
              </div>
              <h3 className="mt-8 break-words text-4xl font-black tracking-[-0.045em] sm:text-5xl">{track.shortName}</h3>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-700">by Serverless Creed</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{track.label}</p>
              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-700">{track.copy}</p>
              <div className="mt-7 border-t border-zinc-300 pt-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">You bring</p>
                <p className="mt-2 font-bold leading-7">{track.requirement}</p>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <span className={`${track.accent} h-4 w-4 border border-zinc-950`} />
                <span className="text-sm font-black uppercase tracking-[0.1em]">3 seats available in this track</span>
              </div>
              <div className="mt-auto pt-8">
                <a href={track.applicationUrl} target="_blank" rel="noreferrer" className={`${track.accent} inline-flex items-center justify-between gap-6 border-2 border-zinc-950 px-5 py-3 text-xs font-black uppercase tracking-wider shadow-[4px_4px_0_#18181b] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none`}>
                  <span>Apply for {track.shortName}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-y-2 border-zinc-950 bg-[#f7f5ef] text-zinc-950">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">How you will work</p>
          <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <h2 className="text-4xl font-black tracking-tight sm:text-6xl">From curiosity<br />to useful content.</h2>
            <p className="max-w-sm text-sm font-medium leading-6 text-zinc-600 md:text-right">We provide the handbook and product manual. You turn guidance into practice—and practice into clarity.</p>
          </div>
          <div className="relative mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {workflow.map((step, index) => (
              <motion.div key={step.title} initial={{ opacity: 1, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: index * 0.12 }} className="relative min-h-[360px] border-2 border-zinc-950 bg-white p-6 shadow-[6px_6px_0_#18181b] sm:p-7">
                <div className="flex items-center justify-between">
                  <span className={`${["bg-amber-300", "bg-lime-300", "bg-sky-200", "bg-pink-200"][index]} grid h-10 w-10 place-items-center rounded-full border-2 border-zinc-950 font-mono text-xs font-black shadow-[2px_2px_0_#18181b]`}>0{index + 1}</span>
                  <span className="text-xl font-black text-zinc-950" aria-hidden="true">→</span>
                </div>
                <h3 className="mt-9 text-2xl font-black text-zinc-950">{step.title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-zinc-600">{step.copy}</p>
                <ul className="mt-6 space-y-3 border-t border-zinc-300 pt-5">
                  {step.tasks.map((task) => (
                    <li key={task} className="flex items-start gap-3 text-sm font-bold leading-5 text-zinc-800">
                      <span className={`${["bg-amber-300", "bg-lime-300", "bg-sky-200", "bg-pink-200"][index]} mt-1 h-3 w-3 shrink-0 border border-zinc-950`} />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-zinc-950 bg-sky-200">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Recruitment timeline</p>
          <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <h2 className="text-4xl font-black tracking-tight sm:text-6xl">Three dates<br />to remember.</h2>
            <p className="max-w-sm text-sm font-bold leading-6 text-zinc-700 md:text-right">Submit your application before the deadline. We will contact selected candidates the following week.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ["01", "31st July 2026", "Applications close"],
              ["02", "First week of August", "Selection decisions shared"],
              ["03", "Second week of August", "Internship begins"],
            ].map(([number, date, event], index) => (
              <motion.div
                key={event}
                initial={{ opacity: 1, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: index * 0.1 }}
                className="border-2 border-zinc-950 bg-[#f7f5ef] p-6 shadow-[6px_6px_0_#18181b] sm:p-7"
              >
                <span className="font-mono text-xs font-bold text-zinc-500">{number}</span>
                <p className="mt-8 text-2xl font-black leading-tight">{date}</p>
                <p className="mt-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-600">{event}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Who we are looking for</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Curiosity over<br />credentials.</h2>
        </div>
        <div className="space-y-4">
          {["You take ownership, investigate thoughtfully, and enjoy figuring things out.", "You can turn complex technical ideas into clear, useful explanations.", "You can commit 1–2 focused hours each weekday for the full three months."].map((item, index) => (
            <motion.div key={item} initial={{ opacity: 1, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className="flex gap-5 border-2 border-zinc-950 bg-white p-5 shadow-[4px_4px_0_#18181b] sm:p-6">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-300 text-sm font-black">✓</span>
              <p className="font-bold leading-7">{item}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t-2 border-zinc-950 px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs font-bold uppercase tracking-wider sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Serverless Creed</span>
          <Link href="/" className="underline decoration-2 underline-offset-4">Back to products</Link>
        </div>
      </footer>
    </main>
  );
}
