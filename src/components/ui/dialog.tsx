"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = Primitive.Root;
const DialogTrigger = Primitive.Trigger;
const DialogClose = Primitive.Close;
const DialogPortal = Primitive.Portal;
function DialogOverlay({ className, ...props }: React.ComponentProps<typeof Primitive.Overlay>) { return <Primitive.Overlay className={cn("fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0", className)} {...props} />; }
function DialogContent({ className, children, showCloseButton = true, closeLabel = "Close", ...props }: React.ComponentProps<typeof Primitive.Content> & { showCloseButton?: boolean; closeLabel?: string }) { return <DialogPortal><DialogOverlay /><Primitive.Content className={cn("fixed start-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 sm:max-w-lg", className)} {...props}>{children}{showCloseButton && <Primitive.Close className="absolute end-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"><X /><span className="sr-only">{closeLabel}</span></Primitive.Close>}</Primitive.Content></DialogPortal>; }
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("flex flex-col gap-2 text-center sm:text-start", className)} {...props} />; }
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />; }
function DialogTitle({ className, ...props }: React.ComponentProps<typeof Primitive.Title>) { return <Primitive.Title className={cn("text-lg font-semibold leading-none", className)} {...props} />; }
function DialogDescription({ className, ...props }: React.ComponentProps<typeof Primitive.Description>) { return <Primitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />; }
export { Dialog, DialogTrigger, DialogClose, DialogPortal, DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
