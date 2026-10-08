import { color } from "framer-motion";
import { text } from "stream/consumers";

interface DisplayProps {
  badge: string;
  title: string;
  description: string;
  color?: string;
  center?: string;
}
export default function Display(props: DisplayProps) {
  return (
    <div className="rounded-lg bg-gray-800 p-8 h-full transition duration-500 hover:bg-[#263244]">
      <div className="inline-block">
        <span
          className={`bg-indigo-700 text-white inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium`}
        >
          {props.badge}
        </span>
      </div>
      <div className={`mt-4 block ${props.center ? "text-center" : ""}`}>
        <p className="text-xl font-semibold text-gray-100">{props.title}</p>
        <p className="mt-3 text-base text-gray-50">{props.description}</p>
      </div>
    </div>
  );
}
