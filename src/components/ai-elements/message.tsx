"use client";

import type { UIMessage } from "ai";
import type { HTMLAttributes } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export function Message({ className, from, ...props }: MessageProps) {
  return (
    <div
      className={cn(
        "group flex w-full flex-col gap-2",
        from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
        className,
      )}
      {...props}
    />
  );
}

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export function MessageContent({
  children,
  className,
  ...props
}: MessageContentProps) {
  return (
    <div
      className={cn(
        "survey-body flex min-w-0 flex-col gap-2 overflow-hidden text-sm leading-7",
        "group-[.is-user]:ml-auto group-[.is-user]:w-fit group-[.is-user]:max-w-[min(100%,36rem)] group-[.is-user]:rounded-[22px] group-[.is-user]:border group-[.is-user]:border-border/70 group-[.is-user]:bg-secondary/85 group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-secondary-foreground group-[.is-user]:shadow-[0_6px_24px_rgba(0,0,0,0.08)]",
        "group-[.is-assistant]:max-w-2xl group-[.is-assistant]:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const MessageResponse = memo(
  ({ children, className }: { children: string; className?: string }) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
    >
      {children}
    </Streamdown>
  ),
  (prev, next) => prev.children === next.children,
);

MessageResponse.displayName = "MessageResponse";
