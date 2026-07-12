"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
function Avatar({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) { return <Primitive.Root className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)} {...props} />; }
function AvatarImage({ className, ...props }: React.ComponentProps<typeof Primitive.Image>) { return <Primitive.Image className={cn("aspect-square size-full", className)} {...props} />; }
function AvatarFallback({ className, ...props }: React.ComponentProps<typeof Primitive.Fallback>) { return <Primitive.Fallback className={cn("flex size-full items-center justify-center rounded-full bg-muted", className)} {...props} />; }
export { Avatar, AvatarImage, AvatarFallback };
