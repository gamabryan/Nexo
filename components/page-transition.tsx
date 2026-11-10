import { cn } from "@/lib/utils";

type PageTransitionProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={cn("page-enter", className)}>{children}</div>;
}
