import DotPattern from "./magicui/dot-pattern";
import WavyText from "./magicui/wavy-text";
import Image from "next/image";
import Link from "next/link";
import { PlaceholdersAndVanishInput } from "./ui/placeholders-and-vanish-input";

const placeholders = [
  "Browse Amazon S3 buckets and objects faster with Buckets by ServerlessCreed",
  "Inspect and edit DynamoDB items without console friction—Tables by Serverless Creed",
  "Copy keys, preview metadata, and move through S3 workflows in one place",
  "Query tables, run scans, and tune reads with Tables by Serverless Creed",
  "Purpose-built UX for S3—less clicking, fewer context switches",
  "Purpose-built UX for DynamoDB—tables, indexes, and items at a glance",
  "Ship quicker AWS data operations with Buckets and Tables by Serverless Creed",
  "Open Buckets for Amazon S3 or Tables for DynamoDB",
  "Replace slow AWS console hops with focused S3 and DynamoDB consoles",
  "Try Buckets and Tables by Serverless Creed—built for engineers who work with AWS data",
];
export default function NewHero() {
  return (
    <div className="px-4 sm:px-6 md:px-8">
      {" "}
      {/* Add padding for mobile */}
      <div className="absolute inset-0">
        <DotPattern className="h-full w-full" />
      </div>
      <section className="flex flex-col items-center justify-center">
        <WavyText
          word="Serverless Creed"
          className="text-lg sm:text-xl md:text-2xl font-bold text-slate-700"
        />
      </section>
      <div className="flex items-center justify-center w-full max-w-[750px] mx-auto">
        <PlaceholdersAndVanishInput placeholders={placeholders} />
      </div>
      {/* Convert row to column on mobile */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10 mt-7">
        <Link
          href={"https://buckets.serverlesscreed.com/"}
          target="_blank"
          className="w-full md:w-auto"
        >
          <button
            className="w-full md:w-[300px] px-4 md:px-8 py-3 md:py-4 
            relative
            border-2 border-black uppercase bg-white text-black 
            transition duration-200 text-xs md:text-sm
            shadow-[1px_1px_rgba(0,0,0),2px_2px_rgba(0,0,0),3px_3px_rgba(0,0,0),4px_4px_rgba(0,0,0),5px_5px_0px_0px_rgba(0,0,0)]  
            hover:translate-y-1"
          >
            📦 Buckets by ServerlessCreed
          </button>
        </Link>

        <Link
          href={"https://tables.serverlesscreed.com/"}
          target="_blank"
          className="w-full md:w-auto"
        >
          <button
            className="w-full md:w-[300px] px-4 md:px-8 py-3 md:py-4 
            relative
            border-2 border-black uppercase bg-white text-black 
            transition duration-200 text-xs md:text-sm
            shadow-[1px_1px_rgba(0,0,0),2px_2px_rgba(0,0,0),3px_3px_rgba(0,0,0),4px_4px_rgba(0,0,0),5px_5px_0px_0px_rgba(0,0,0)]  
            hover:translate-y-1"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff4e5] shadow-sm ring-1 ring-amber-200">
                <Image
                  src="/serverless-tables.png"
                  alt=""
                  width={28}
                  height={28}
                  aria-hidden="true"
                  className="h-7 w-7 object-contain"
                />
              </span>
              Tables by Serverless Creed
            </span>
          </button>
        </Link>
      </div>
    </div>
  );
}
