import type { Capability } from "../config/schema.js";

export type CcswitchProvider = {
  id: string;
  name: string;
  appType: string;
  model: string;
  baseUrl: string;
  wireApi: string;
  hasSecret: boolean;
  isCurrentCodex: boolean;
  capabilities: Capability[];
};

export type CcswitchReadOptions = {
  root?: string;
  pythonCommand?: string;
};
