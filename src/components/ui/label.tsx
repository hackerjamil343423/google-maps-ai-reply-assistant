"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
function Label({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) { return <Primitive.Root className={cn("flex items-center gap-2 text-sm font-medium leading-none peer-disabled:opacity-50", className)} {...props} />; }
export { Label };
