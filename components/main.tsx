import { cn } from "cn";

interface MainProps {
  children: React.ReactNode;
  className: string;
}

export default function Main({ children, className }: MainProps) {
  return <main className={cn("flex-1", className)}>{children}</main>;
}
