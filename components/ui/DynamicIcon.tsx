"use client";

import React from "react";
import * as Icons from "lucide-react";
import { LucideProps } from "lucide-react";

interface DynamicIconProps extends LucideProps {
  name: string;
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  // Safe lookup in Lucide icon set
  const IconComponent = (Icons as unknown as Record<string, React.FC<LucideProps>>)[name] || Icons.FileText;
  return <IconComponent {...props} />;
}
