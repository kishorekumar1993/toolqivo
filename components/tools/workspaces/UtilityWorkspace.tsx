"use client";

import React from "react";
import { Tool } from "@/data/types";
import { QrCodeWorkspace } from "./utility/QrCodeWorkspace";
import { PasswordWorkspace } from "./utility/PasswordWorkspace";
import { WordCounterWorkspace } from "./utility/WordCounterWorkspace";
import { JsonFormatterWorkspace } from "./utility/JsonFormatterWorkspace";

interface UtilityWorkspaceProps {
  tool: Tool;
}

export function UtilityWorkspace({ tool }: UtilityWorkspaceProps) {
  switch (tool.id) {
    case "qr-code-generator":
      return <QrCodeWorkspace tool={tool} />;
    case "password-generator":
      return <PasswordWorkspace tool={tool} />;
    case "word-counter":
      return <WordCounterWorkspace tool={tool} />;
    case "json-formatter":
      return <JsonFormatterWorkspace tool={tool} />;
    default:
      return <WordCounterWorkspace tool={tool} />;
  }
}
