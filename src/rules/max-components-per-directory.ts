import type { Rule } from "eslint";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_MAX = 1;
const MAX_LIMIT = 64;

const DEFAULT_EXTENSIONS = [".jsx", ".tsx"] as const;

const DEFAULT_COMPANIONS = [
  "stories",
  "story",
  "styles",
  "style",
  "test",
  "spec",
  "types",
  "type",
] as const;

const DEFAULT_IGNORE_BASENAMES = [
  "index",
  "page",
  "layout",
  "loading",
  "error",
  "not-found",
  "template",
  "default",
  "route",
] as const;

const SYNTHETIC_FILENAMES = new Set(["<input>", "<text>"]);

const optionSchema = [
  {
    type: "object",
    properties: {
      max: {
        type: "integer",
        minimum: 1,
        maximum: MAX_LIMIT,
      },
      extensions: {
        type: "array",
        items: {
          type: "string",
          pattern: "^\\.[A-Za-z0-9]+$",
          minLength: 1,
        },
        minItems: 1,
        uniqueItems: true,
      },
      companions: {
        type: "array",
        items: {
          type: "string",
          pattern: "^[A-Za-z0-9-]+$",
          minLength: 1,
        },
        uniqueItems: true,
      },
      ignoreBasenames: {
        type: "array",
        items: {
          type: "string",
          minLength: 1,
        },
        uniqueItems: true,
      },
      ignoreDirectories: {
        type: "array",
        items: {
          type: "string",
          minLength: 1,
        },
        uniqueItems: true,
      },
    },
    additionalProperties: false,
  },
] as const;

interface RuleOption {
  max?: number;
  extensions?: readonly string[];
  companions?: readonly string[];
  ignoreBasenames?: readonly string[];
  ignoreDirectories?: readonly string[];
}

type Options = [RuleOption?];

interface DirectoryListing {
  readonly mtimeMs: number;
  readonly primaryStems: readonly string[];
}

const directoryListingCache = new Map<string, DirectoryListing>();

function toPosix(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.]/gu, "\\$&");
}

function globToRegExp(pattern: string): RegExp {
  const normalized = toPosix(pattern).replace(/^\.\//u, "");

  let regex = "^";
  let index = 0;

  while (index < normalized.length) {
    if (normalized.startsWith("**/", index)) {
      regex += "(?:.*/)?";
      index += 3;

      continue;
    }

    if (normalized.startsWith("**", index) && index + 2 === normalized.length) {
      regex += ".*";
      index += 2;

      continue;
    }

    const current = normalized[index];

    if (current === "*") {
      regex += "[^/]*";
      index += 1;

      continue;
    }

    if (current === "?") {
      regex += "[^/]";
      index += 1;

      continue;
    }

    regex += escapeRegex(current ?? "");
    index += 1;
  }

  regex += "$";

  return new RegExp(regex, "u");
}

function matchesGlob(filePath: string, pattern: string): boolean {
  return globToRegExp(pattern).test(toPosix(filePath).replace(/^\.\//u, ""));
}

function getCwd(context: Rule.RuleContext): string {
  if (typeof context.cwd === "string" && context.cwd !== "") {
    return context.cwd;
  }

  return process.cwd();
}

function resolveLintFilename(
  filename: string,
  cwd: string,
): string | undefined {
  if (filename === "" || SYNTHETIC_FILENAMES.has(filename)) {
    return undefined;
  }

  return path.resolve(cwd, filename);
}

function displayDirectory(directory: string, cwd: string): string {
  const relative = toPosix(path.relative(cwd, directory));

  if (relative === "" || relative === ".") {
    return ".";
  }

  if (relative.startsWith("../")) {
    return toPosix(directory);
  }

  return relative;
}

function pathVariantsForDirectory(
  directory: string,
  cwd: string,
): readonly string[] {
  const variants = new Set<string>([toPosix(directory)]);
  const relativeToCwd = toPosix(path.relative(cwd, directory));

  if (relativeToCwd !== "") {
    variants.add(relativeToCwd);
  }

  return [...variants];
}

function matchesAnyDirectoryPattern(
  directory: string,
  patterns: readonly string[],
  cwd: string,
): boolean {
  const variants = pathVariantsForDirectory(directory, cwd);

  return patterns.some((pattern) =>
    variants.some((variant) => matchesGlob(variant, pattern)),
  );
}

function toSortedSet(values: readonly string[]): string {
  return [...values].sort().join("\0");
}

function primaryStem(
  filename: string,
  extensions: ReadonlySet<string>,
  companions: ReadonlySet<string>,
): string | undefined {
  const extension = path.extname(filename);

  if (!extensions.has(extension) || filename.startsWith(".")) {
    return undefined;
  }

  const stem = filename.slice(0, -extension.length);
  const segments = stem.split(".");
  const originalLength = segments.length;

  while (
    segments.length > 1 &&
    companions.has((segments[segments.length - 1] ?? "").toLowerCase())
  ) {
    segments.pop();
  }

  if (
    segments.length !== originalLength ||
    segments.some((segment) => segment.length === 0)
  ) {
    return undefined;
  }

  const name = segments.join(".");

  return name.length > 0 ? name : undefined;
}

function classifyPrimaryStem(
  basename: string,
  extensions: ReadonlySet<string>,
  companions: ReadonlySet<string>,
  ignoreBasenames: ReadonlySet<string>,
): string | undefined {
  const stem = primaryStem(basename, extensions, companions);

  if (stem === undefined || ignoreBasenames.has(stem)) {
    return undefined;
  }

  return stem;
}

function listingCacheKey(
  directory: string,
  extensions: ReadonlySet<string>,
  companions: ReadonlySet<string>,
  ignoreBasenames: ReadonlySet<string>,
): string {
  return [
    directory,
    toSortedSet([...extensions]),
    toSortedSet([...companions].map((value) => value.toLowerCase())),
    toSortedSet([...ignoreBasenames]),
  ].join("\n");
}

function listPrimaryStems(
  directory: string,
  extensions: ReadonlySet<string>,
  companions: ReadonlySet<string>,
  ignoreBasenames: ReadonlySet<string>,
): readonly string[] | undefined {
  const cacheKey = listingCacheKey(
    directory,
    extensions,
    companions,
    ignoreBasenames,
  );

  try {
    const stat = fs.statSync(directory);
    const cached = directoryListingCache.get(cacheKey);

    if (cached?.mtimeMs === stat.mtimeMs) {
      return cached.primaryStems;
    }

    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const stems = new Set<string>();

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const stem = classifyPrimaryStem(
        entry.name,
        extensions,
        companions,
        ignoreBasenames,
      );

      if (stem !== undefined) {
        stems.add(stem);
      }
    }

    const primaryStems = [...stems].sort((a, b) => a.localeCompare(b));

    directoryListingCache.set(cacheKey, {
      mtimeMs: stat.mtimeMs,
      primaryStems,
    });

    return primaryStems;
  } catch {
    return undefined;
  }
}

function toReadonlySet(values: readonly string[]): ReadonlySet<string> {
  return new Set(values);
}

function getExtensions(options: RuleOption | undefined): ReadonlySet<string> {
  return toReadonlySet(options?.extensions ?? DEFAULT_EXTENSIONS);
}

function getCompanions(options: RuleOption | undefined): ReadonlySet<string> {
  const companions = options?.companions ?? DEFAULT_COMPANIONS;

  return toReadonlySet(companions.map((value) => value.toLowerCase()));
}

function getIgnoreBasenames(
  options: RuleOption | undefined,
): ReadonlySet<string> {
  return toReadonlySet(options?.ignoreBasenames ?? DEFAULT_IGNORE_BASENAMES);
}

function getMax(options: RuleOption | undefined): number {
  return options?.max ?? DEFAULT_MAX;
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Limit distinct JSX/TSX component names in a single directory.",
      recommended: false,
      url: "https://github.com/joonarafael/eslint-plugin-pet-peeves/blob/master/docs/rules/max-components-per-directory.md",
    },
    schema: optionSchema,
    messages: {
      tooManyComponents:
        "Directory '{{directory}}' has {{count}} components ({{names}}). The maximum allowed is {{max}}. Move the extra components into subdirectories.",
    },
  },

  create(context) {
    const options = context.options as Options;
    const ruleOptions = options[0];
    const max = getMax(ruleOptions);
    const extensions = getExtensions(ruleOptions);
    const companions = getCompanions(ruleOptions);
    const ignoreBasenames = getIgnoreBasenames(ruleOptions);
    const ignoreDirectories = ruleOptions?.ignoreDirectories ?? [];

    const cwd = getCwd(context);
    const filename = resolveLintFilename(context.filename, cwd);

    if (filename === undefined) {
      return {};
    }

    const fileExtension = path.extname(filename);

    if (!extensions.has(fileExtension)) {
      return {};
    }

    const directory = path.dirname(filename);

    if (matchesAnyDirectoryPattern(directory, ignoreDirectories, cwd)) {
      return {};
    }

    const primaryStems = listPrimaryStems(
      directory,
      extensions,
      companions,
      ignoreBasenames,
    );

    if (primaryStems === undefined || primaryStems.length <= max) {
      return {};
    }

    const directoryLabel = displayDirectory(directory, cwd);
    const names = primaryStems.join(", ");

    return {
      Program(node): void {
        context.report({
          node,
          messageId: "tooManyComponents",
          data: {
            directory: directoryLabel,
            count: String(primaryStems.length),
            names,
            max: String(max),
          },
        });
      },
    };
  },
};

export default rule;
