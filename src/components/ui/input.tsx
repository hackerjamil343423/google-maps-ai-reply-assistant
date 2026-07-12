import * as React from "react";
import { cn } from "@/lib/utils";
function Input({ className, type, ...props }: React.ComponentProps<"input">) { return <input type={type} className={cn("h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-base outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50 md:text-sm", className)} {...props} />; }
export { Input };
