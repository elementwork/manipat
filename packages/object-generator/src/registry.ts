import {
  APERTURE_ADVANCED_TEMPLATES,
} from "./templates/aperture-advanced-templates.js";
import {
  APERTURE_COMPLEX_TEMPLATES,
} from "./templates/aperture-complex-templates.js";
import {
  APERTURE_FACETED_TEMPLATES,
} from "./templates/aperture-faceted-templates.js";
import { APERTURE_TEMPLATES } from "./templates/aperture-templates.js";
import { TFE_ADVANCED_TEMPLATES } from "./templates/tfe-advanced-templates.js";
import { TFE_TEMPLATES } from "./templates/tfe-templates.js";
import type { ObjectTemplate } from "./types.js";

const TEMPLATE_BANKS: readonly (readonly ObjectTemplate[])[] = [
  APERTURE_TEMPLATES,
  APERTURE_COMPLEX_TEMPLATES,
  APERTURE_FACETED_TEMPLATES,
  APERTURE_ADVANCED_TEMPLATES,
  TFE_TEMPLATES,
  TFE_ADVANCED_TEMPLATES,
];

const templateRegistry = new Map<string, ObjectTemplate>();
for (const bank of TEMPLATE_BANKS) {
  for (const template of bank) {
    const existing = templateRegistry.get(template.id);
    if (existing !== undefined && existing !== template) {
      throw new Error(`Duplicate object template id: ${template.id}`);
    }
    templateRegistry.set(template.id, template);
  }
}

/** All registered procedural 3D object templates, in stable bank order. */
export const OBJECT_TEMPLATES: readonly ObjectTemplate[] = Object.freeze(
  [...templateRegistry.values()],
);

/** Return a template when present without throwing. */
export const findObjectTemplate = (templateId: string): ObjectTemplate | undefined =>
  templateRegistry.get(templateId);

/** Resolve a persisted template id back to its deterministic generator. */
export const getObjectTemplate = (templateId: string): ObjectTemplate => {
  const template = findObjectTemplate(templateId);
  if (template === undefined) throw new RangeError(`Unknown object template: ${templateId}`);
  return template;
};
