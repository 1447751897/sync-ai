import type { RouterConfig } from "../config/schema.js";
import { CapabilityRouter } from "./capabilityRouter.js";
import type { FetchLike, GenerateImageRequest, GenerateImageResult } from "./types.js";

export class ImageRouter {
  private readonly router: CapabilityRouter;

  constructor(args: {
    config: RouterConfig;
    fetchImpl?: FetchLike;
    env?: Record<string, string | undefined>;
  }) {
    this.router = new CapabilityRouter(args);
  }

  async generate(request: GenerateImageRequest): Promise<GenerateImageResult> {
    return this.router.generateImage(request);
  }
}
