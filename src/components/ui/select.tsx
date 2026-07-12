"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
const Select = Primitive.Root;
const SelectGroup = Primitive.Group;
const SelectValue = Primitive.Value;
function SelectTrigger({ className, size = "default", children, ...props }: React.ComponentProps<typeof Primitive.Trigger> & { size?: "sm" | "default" }) { return <Primitive.Trigger data-size={size} className={cn("flex w-fit items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring data-[size=default]:h-9 data-[size=sm]:h-8", className)} {...props}>{children}<Primitive.Icon asChild><ChevronDown className="size-4 opacity-50" /></Primitive.Icon></Primitive.Trigger>; }
function SelectContent({ className, children, position = "popper", ...props }: React.ComponentProps<typeof Primitive.Content>) { return <Primitive.Portal><Primitive.Content position={position} className={cn("z-50 max-h-72 min-w-32 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md", className)} {...props}><Primitive.ScrollUpButton className="flex h-6 items-center justify-center"><ChevronUp /></Primitive.ScrollUpButton><Primitive.Viewport className="p-1">{children}</Primitive.Viewport><Primitive.ScrollDownButton className="flex h-6 items-center justify-center"><ChevronDown /></Primitive.ScrollDownButton></Primitive.Content></Primitive.Portal>; }
function SelectLabel({ className, ...props }: React.ComponentProps<typeof Primitive.Label>) { return <Primitive.Label className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)} {...props} />; }
function SelectItem({ className, children, ...props }: React.ComponentProps<typeof Primitive.Item>) { return <Primitive.Item className={cn("relative flex cursor-default items-center rounded-md py-1.5 pe-8 ps-2 text-sm outline-none focus:bg-accent data-[disabled]:opacity-50", className)} {...props}><span className="absolute end-2 flex size-3.5 items-center justify-center"><Primitive.ItemIndicator><Check /></Primitive.ItemIndicator></span><Primitive.ItemText>{children}</Primitive.ItemText></Primitive.Item>; }
function SelectSeparator({ className, ...props }: React.ComponentProps<typeof Primitive.Separator>) { return <Primitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />; }
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator };
