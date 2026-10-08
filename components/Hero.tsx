import React from "react";
import Link from "next/link";
import Image from "next/image";
import Display from "./Display";
export default function Hero() {
  return (
    <div className="bg-gray-900 ">
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <header className="absolute inset-x-0 top-0 z-50">
          <nav
            className="flex items-center justify-between p-6 lg:px-8"
            aria-label="Global"
          >
            <div className="flex lg:flex-1 ">
              <a href="#" className="-m-1.5 p-1.5">
                <span className="sr-only">Serverless Creed</span>
                <Image
                  src="/creedlogo.png"
                  alt="Site logo"
                  height={300}
                  width={300}
                />
              </a>
            </div>
            <div className="hidden lg:flex lg:flex-1 lg:justify-end">
              <Link
                href="https://www.shahvidit.com/"
                className="text-sm font-semibold leading-6 text-white"
              >
                About the Dev <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </nav>
        </header>
      </div>

      <div className="relative isolate pt-14">
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>
        <div className="py-24 sm:py-32 lg:pb-40 ">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-5xl text-center">
              <h1 className="text-2xl leading-8 font-bold tracking-tight text-white sm:text-6xl sm:leading-tight">
                Buckets and Tables by Serverless Creed—focused desktop tools for Amazon S3 and DynamoDB
              </h1>
              <NotifyMe />
            </div>

            <div className="flex gap-5 mt-5">
              <Link href="https://buckets.serverlesscreed.com/" target="_blank">
                <Display
                  badge="Buckets by ServerlessCreed"
                  title="Amazon S3, without the slog"
                  description="Buckets, objects, and key workflows tuned for speed—less generic console, more getting work done."
                  color="indigo"
                  center="true"
                />
              </Link>
              <Link href="https://tables.serverlesscreed.com/" target="_blank">
                <Display
                  badge="Tables by Serverless Creed"
                  title="DynamoDB that stays out of your way"
                  description="Tables, indexes, and items in a focused UI—built for day-to-day DynamoDB ops."
                  color="indigo"
                  center="true"
                />
              </Link>
            </div>
            <h2 className="text-l text-white text-center m-4 mt-10">
              Two products—object storage and NoSQL—same bar for craft and speed
            </h2>
            <div className="flex justify-between gap-5">
              <Link href="https://buckets.serverlesscreed.com/" target="_blank">
                <Display
                  badge="S3"
                  title="Objects & metadata"
                  description="Preview, copy paths, and navigate buckets with a console meant for S3."
                  color="red"
                />
              </Link>
              <Link href="https://tables.serverlesscreed.com/" target="_blank">
                <Display
                  badge="DynamoDB"
                  title="Tables & items"
                  description="Inspect and edit data with workflows optimized for DynamoDB, not every AWS service."
                  color="teal"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const NotifyMe = () => {
  return (
    <Link
      className="items-center mt-4 justify-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 hero-join-button-dark group relative mx-auto hidden w-fit overflow-hidden rounded-xl p-[1px] font-bold transition-all duration-300 dark:block dark:hover:shadow-[0_0_2rem_-0.5rem_#fff8] md:mr-0 lg:mr-auto"
      href="https://serverlesscreed.ck.page/c5015ac74e"
      target="_blank"
    >
      <span className="inline-flex h-full w-fit items-center gap-1 rounded-xl px-4 py-2 transition-all duration-300 dark:bg-neutral-900 dark:text-white group-hover:dark:bg-black">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1 h-4 w-4 stroke-[3]"
        >
          <rect width="20" height="16" x="2" y="4" rx="2"></rect>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
        </svg>
        Notify Me
      </span>
    </Link>
  );
};
