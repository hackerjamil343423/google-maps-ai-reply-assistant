"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const Sheet = Primitive.Root;
const SheetTrigger = Primitive.Trigger;
const SheetClose = Primitive.Close;
const SheetPortal = Primitive.Portal;
function SheetOverlay({ className, ...props }: React.ComponentProps<typeof Primitive.Overlay>) { return <Primitive.Overlay className={cn("fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0", className)} {...props} />; }
const sheetVariants = cva("fixed z-50 bg-background shadow-lg transition data-[state=open]:animate-in data-[state=closed]:animate-out", { variants: { side: { top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top", bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom", left: "inset-y-0 left-0 h-full border-e data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left", right: "inset-y-0 right-0 h-full border-s data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right" } }, defaultVariants: { side: "right" } });
function SheetContent({ side, className, children, showCloseButton = true, ...props }: React.ComponentProps<typeof Primitive.Content> & VariantProps<typeof sheetVariants> & { showCloseButton?: boolean }) { return <SheetPortal><SheetOverlay /><Primitive.Content className={cn(sheetVariants({ side }), className)} {...props}>{children}{showCloseButton && <Primitive.Close className="absolute end-4 top-4 rounded-md opacity-70 hover:opacity-100"><X /><span className="sr-only">Close</span></Primitive.Close>}</Primitive.Content></SheetPortal>; }
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("flex flex-col gap-2 p-4", className)} {...props} />; }
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />; }
const SheetTitle = Primitive.Title;
const SheetDescription = Primitive.Description;
export { Sheet, SheetTrigger, SheetClose, SheetPortal, SheetOverlay, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
