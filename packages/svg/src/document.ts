import { createSvgElement, type SvgAttributeValue, type SvgElement } from "./nodes.js";

export interface SvgDocumentOptions {
  readonly viewBox: readonly [number, number, number, number];
  readonly children: readonly SvgElement[];
  readonly title: string;
  readonly description?: string;
  readonly attributes?: Readonly<Record<string, SvgAttributeValue>>;
}

const escapeText = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const escapeAttribute = (value: string): string => escapeText(value)
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const renderElement = (node: SvgElement): string => {
  const attributes = Object.entries(node.attributes)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([name, value]) => ` ${name}="${escapeAttribute(String(value))}"`)
    .join("");
  if (node.children.length === 0) {
    return `<${node.tag}${attributes}/>`;
  }
  const children = node.children
    .map((child) => typeof child === "string" ? escapeText(child) : renderElement(child))
    .join("");
  return `<${node.tag}${attributes}>${children}</${node.tag}>`;
};

/** Serializes a deterministic, accessible SVG document. */
export const svgDocument = (options: SvgDocumentOptions): string => {
  const titleId = "svg-title";
  const descriptionId = options.description === undefined ? undefined : "svg-description";
  const labelledBy = descriptionId === undefined ? titleId : `${titleId} ${descriptionId}`;
  const metadata: SvgElement[] = [
    createSvgElement("title", { id: titleId }, [options.title]),
  ];
  if (options.description !== undefined) {
    metadata.push(
      createSvgElement("desc", { id: descriptionId }, [options.description]),
    );
  }
  const root = createSvgElement("svg", {
    ...options.attributes,
    "aria-labelledby": labelledBy,
    role: "img",
    viewBox: options.viewBox.join(" "),
    xmlns: "http://www.w3.org/2000/svg",
  }, [...metadata, ...options.children]);
  return renderElement(root);
};
