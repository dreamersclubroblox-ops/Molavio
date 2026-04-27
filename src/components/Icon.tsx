import * as Icons from "lucide-react";
import { LucideProps } from "lucide-react";

interface Props extends LucideProps {
  name: string;
}

/** Render a Lucide icon by name. Falls back to Box if not found. */
export function Icon({ name, ...props }: Props) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[name] ?? Icons.Box;
  return <Cmp {...props} />;
}
