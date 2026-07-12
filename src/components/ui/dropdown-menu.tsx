"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = Primitive.Root;
const DropdownMenuTrigger = Primitive.Trigger;
const DropdownMenuGroup = Primitive.Group;
const DropdownMenuPortal = Primitive.Portal;
const DropdownMenuSub = Primitive.Sub;
const DropdownMenuRadioGroup = Primitive.RadioGroup;
function DropdownMenuContent({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof Primitive.Content>) { return <Primitive.Portal><Primitive.Content sideOffset={sideOffset} className={cn("z-50 min-w-32 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out", className)} {...props} /></Primitive.Portal>; }
function DropdownMenuItem({ className, inset, ...props }: React.ComponentProps<typeof Primitive.Item> & { inset?: boolean }) { return <Primitive.Item className={cn("relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", inset && "ps-8", className)} {...props} />; }
function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof Primitive.Label> & { inset?: boolean }) { return <Primitive.Label className={cn("px-2 py-1.5 text-sm font-semibold", inset && "ps-8", className)} {...props} />; }
function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof Primitive.Separator>) { return <Primitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />; }
function DropdownMenuCheckboxItem({ className, children, checked, ...props }: React.ComponentProps<typeof Primitive.CheckboxItem>) { return <Primitive.CheckboxItem checked={checked} className={cn("relative flex cursor-default items-center rounded-md py-1.5 pe-2 ps-8 text-sm outline-none focus:bg-accent", className)} {...props}><span className="absolute start-2 flex size-3.5 items-center justify-center"><Primitive.ItemIndicator><Check /></Primitive.ItemIndicator></span>{children}</Primitive.CheckboxItem>; }
function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof Primitive.RadioItem>) { return <Primitive.RadioItem className={cn("relative flex cursor-default items-center rounded-md py-1.5 pe-2 ps-8 text-sm outline-none focus:bg-accent", className)} {...props}><span className="absolute start-2 flex size-3.5 items-center justify-center"><Primitive.ItemIndicator><span className="size-2 rounded-full bg-current" /></Primitive.ItemIndicator></span>{children}</Primitive.RadioItem>; }
function DropdownMenuSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof Primitive.SubTrigger> & { inset?: boolean }) { return <Primitive.SubTrigger className={cn("flex items-center rounded-md px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent", inset && "ps-8", className)} {...props}>{children}<ChevronRight className="ms-auto rtl:rotate-180" /></Primitive.SubTrigger>; }
function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof Primitive.SubContent>) { return <Primitive.SubContent className={cn("z-50 min-w-32 rounded-lg border border-border bg-popover p-1 shadow-md", className)} {...props} />; }
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem };
