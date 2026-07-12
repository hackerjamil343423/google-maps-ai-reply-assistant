"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof Primitive.Provider>) { return <Primitive.Provider delayDuration={delayDuration} {...props} />; }
const Tooltip = Primitive.Root;
const TooltipTrigger = Primitive.Trigger;
function TooltipContent({ className, sideOffset = 4, children, ...props }: React.ComponentProps<typeof Primitive.Content>) { return <Primitive.Portal><Primitive.Content sideOffset={sideOffset} className={cn("z-50 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95", className)} {...props}>{children}<Primitive.Arrow className="fill-primary" /></Primitive.Content></Primitive.Portal>; }
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
