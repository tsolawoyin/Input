import { createLowlight, common } from "lowlight";

// Single shared registry: the editor highlights from it and the toolbar reads
// the available languages from it, so both always agree.
export const lowlight = createLowlight(common);
