"use client";

import React from "react";
import { Tool } from "@/data/types";
import { EmiCalculatorWorkspace } from "./EmiCalculatorWorkspace";
import { SipCalculatorWorkspace } from "./SipCalculatorWorkspace";
import { SalaryCalculatorWorkspace } from "./SalaryCalculatorWorkspace";
import { GstCalculatorWorkspace } from "./GstCalculatorWorkspace";
import { FdRdCalculatorWorkspace } from "./FdRdCalculatorWorkspace";
import { PpfCalculatorWorkspace } from "./PpfCalculatorWorkspace";
import { CompoundInterestWorkspace } from "./CompoundInterestWorkspace";

interface FinanceWorkspaceProps {
  tool: Tool;
}

export function FinanceWorkspace({ tool }: FinanceWorkspaceProps) {
  switch (tool.id) {
    case "emi-calculator":
      return <EmiCalculatorWorkspace tool={tool} />;

    case "sip-calculator":
      return <SipCalculatorWorkspace tool={tool} />;

    case "salary-calculator":
      return <SalaryCalculatorWorkspace tool={tool} />;

    case "gst-calculator":
      return <GstCalculatorWorkspace tool={tool} />;

    case "fd-calculator":
    case "rd-calculator":
      return <FdRdCalculatorWorkspace tool={tool} />;

    case "ppf-calculator":
      return <PpfCalculatorWorkspace tool={tool} />;

    case "compound-interest-calculator":
      return <CompoundInterestWorkspace tool={tool} />;

    default:
      return <EmiCalculatorWorkspace tool={tool} />;
  }
}
