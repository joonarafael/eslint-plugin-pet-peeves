import type { Rule, Scope } from "eslint";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_IGNORE_TYPES = true;
const DEFAULT_REPORT_USED_LOCALS = false;
const DEFAULT_DETECT_ENTRYPOINTS = true;

const SYNTHETIC_FILENAMES = new Set(["<input>", "<text>"]);

const IMPLEMENTATION_FOLDERS = new Set(["dist", "build", "lib"]);
const SOURCE_FOLDER = "src";

const MODULE_EXTENSION_PATTERN = /\.(?:d\.[cm]?ts|[cm]?[jt]sx?)$/u;

const optionSchema = [
  {
    type: "object",
    properties: {
      ignoreTypes: {
        type: "boolean",
      },
      reportUsedLocals: {
        type: "boolean",
      },
      detectEntrypoints: {
        type: "boolean",
      },
      include: {
        type: "array",
        items: {
          type: "string",
          minLength: 1,
        },
        uniqueItems: true,
      },
      exclude: {
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
  ignoreTypes?: boolean;
  reportUsedLocals?: boolean;
  detectEntrypoints?: boolean;
  include?: readonly string[];
  exclude?: readonly string[];
}

type Options = [RuleOption?];

interface Kinded {
  readonly importKind?: string | undefined;
  readonly exportKind?: string | undefined;
}

interface PackageInfo {
  readonly directory: string;
  readonly entryKeys: ReadonlySet<string>;
}

interface StringLiteralNode {
  readonly type: string;
  readonly value?: unknown;
}

type IdentifierNode = Rule.Node & {
  type: "Identifier";
  name: string;
};

interface LiteralNameNode {
  readonly type: "Literal";
  readonly value?: unknown;
}

type ModuleNameNode = IdentifierNode | LiteralNameNode;

interface ExportSpecifierNode {
  readonly type: "ExportSpecifier";
  readonly local: ModuleNameNode;
  readonly exported: ModuleNameNode;
  readonly exportKind?: string | undefined;
}

interface ExportNamedDeclarationNode {
  readonly type: "ExportNamedDeclaration";
  readonly declaration: Rule.Node | null;
  readonly specifiers: readonly ExportSpecifierNode[];
  readonly source: StringLiteralNode | null;
  readonly exportKind?: string | undefined;
}

interface ExportAllDeclarationNode {
  readonly type: "ExportAllDeclaration";
  readonly source: StringLiteralNode;
  readonly exported: ModuleNameNode | null;
  readonly exportKind?: string | undefined;
}

interface ExportDefaultDeclarationNode {
  readonly type: "ExportDefaultDeclaration";
  readonly declaration: Rule.Node;
}

interface ImportInfo {
  readonly source: string;
  readonly isTypeOnly: boolean;
}

const packageInfoByDirectory = new Map<string, PackageInfo | null>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function stripModuleExtension(relativePath: string): string {
  return relativePath.replace(MODULE_EXTENSION_PATTERN, "");
}

function relativeModuleKeys(relativePath: string): Set<string> {
  const posix = toPosix(relativePath).replace(/^\.\//u, "");

  const keys = new Set<string>();

  const add = (rel: string): void => {
    keys.add(rel);
    keys.add(stripModuleExtension(rel));
  };

  add(posix);

  const slashIndex = posix.indexOf("/");

  const first = slashIndex === -1 ? posix : posix.slice(0, slashIndex);
  const rest = slashIndex === -1 ? "" : posix.slice(slashIndex + 1);

  if (first === SOURCE_FOLDER && rest !== "") {
    for (const folder of IMPLEMENTATION_FOLDERS) {
      add(`${folder}/${rest}`);
    }

    if (stripModuleExtension(rest) === "index") {
      add(rest);
    }
  }

  if (IMPLEMENTATION_FOLDERS.has(first) && rest !== "") {
    add(`${SOURCE_FOLDER}/${rest}`);
  }

  if (stripModuleExtension(posix) === "index") {
    add(`${SOURCE_FOLDER}/index`);
  }

  return keys;
}

function isSourcePath(value: string): boolean {
  if (!value.startsWith(".")) {
    return false;
  }

  const posix = toPosix(value);

  return !posix.endsWith(".json") && !posix.endsWith(".node");
}

function collectPathStrings(value: unknown, into: string[]): void {
  if (typeof value === "string") {
    if (isSourcePath(value)) {
      into.push(value);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectPathStrings(entry, into);
    }

    return;
  }

  if (isRecord(value)) {
    for (const nested of Object.values(value)) {
      collectPathStrings(nested, into);
    }
  }
}

function collectDeclaredEntries(
  packageJson: Record<string, unknown>,
): string[] {
  const entries: string[] = [];
  const stringFields = ["main", "module", "types", "typings"] as const;

  for (const field of stringFields) {
    const value = packageJson[field];

    if (typeof value === "string" && isSourcePath(value)) {
      entries.push(value);
    }
  }

  collectPathStrings(packageJson.exports, entries);
  return entries;
}

function readJson(filePath: string): unknown {
  try {
    const text = fs.readFileSync(filePath, "utf8");

    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function readPackageInfo(
  packageJsonPath: string,
  directory: string,
): PackageInfo {
  const parsed = readJson(packageJsonPath);
  const entryKeys = new Set<string>();

  if (isRecord(parsed)) {
    for (const relativeEntry of collectDeclaredEntries(parsed)) {
      for (const key of relativeModuleKeys(relativeEntry)) {
        entryKeys.add(key);
      }
    }
  }

  return { directory, entryKeys };
}

function directoriesTowardRoot(startDir: string): string[] {
  const directories: string[] = [startDir];

  let current = startDir;
  let parent = path.dirname(current);

  while (parent !== current) {
    directories.push(parent);
    current = parent;
    parent = path.dirname(current);
  }

  return directories;
}

function findNearestPackage(startDir: string): PackageInfo | undefined {
  const directories = directoriesTowardRoot(startDir);

  for (const [index, current] of directories.entries()) {
    const cached = packageInfoByDirectory.get(current);

    if (cached !== undefined) {
      for (const directory of directories.slice(0, index)) {
        packageInfoByDirectory.set(directory, cached);
      }

      return cached ?? undefined;
    }

    const packageJsonPath = path.join(current, "package.json");

    if (fs.existsSync(packageJsonPath)) {
      const info = readPackageInfo(packageJsonPath, current);

      packageInfoByDirectory.set(current, info);

      for (const directory of directories.slice(0, index)) {
        packageInfoByDirectory.set(directory, info);
      }

      return info;
    }
  }

  for (const directory of directories) {
    packageInfoByDirectory.set(directory, null);
  }

  return undefined;
}

function isPackageEntrypoint(
  filename: string,
  packageInfo: PackageInfo,
): boolean {
  const relative = toPosix(path.relative(packageInfo.directory, filename));

  if (relative.startsWith("../") || relative === "") {
    return false;
  }

  for (const key of relativeModuleKeys(relative)) {
    if (packageInfo.entryKeys.has(key)) {
      return true;
    }
  }

  return false;
}

function pathVariants(
  filename: string,
  cwd: string,
  packageDirectory: string | undefined,
): string[] {
  const variants = new Set<string>([toPosix(filename)]);
  const relativeToCwd = toPosix(path.relative(cwd, filename));

  if (relativeToCwd !== "") {
    variants.add(relativeToCwd);
  }

  if (packageDirectory !== undefined) {
    const relativeToPackage = toPosix(
      path.relative(packageDirectory, filename),
    );

    if (relativeToPackage !== "" && !relativeToPackage.startsWith("../")) {
      variants.add(relativeToPackage);
    }
  }

  return [...variants];
}

function matchesAnyPattern(
  filename: string,
  patterns: readonly string[],
  cwd: string,
  packageDirectory: string | undefined,
): boolean {
  const variants = pathVariants(filename, cwd, packageDirectory);

  return patterns.some((pattern) =>
    variants.some((variant) => matchesGlob(variant, pattern)),
  );
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

function isTypeKind(kind: string | undefined): boolean {
  return kind === "type" || kind === "typeof";
}

function asKinded(node: object): Kinded {
  return node;
}

function getStringLiteralValue(
  node: { readonly value?: unknown } | null,
): string | undefined {
  if (node === null || typeof node.value !== "string") {
    return undefined;
  }

  return node.value;
}

function moduleName(node: ModuleNameNode): string {
  if (node.type === "Identifier") {
    return node.name;
  }

  if (typeof node.value === "string") {
    return node.value;
  }

  return "default";
}

function isIdentifierNode(
  node: Rule.Node | ModuleNameNode,
): node is IdentifierNode {
  return node.type === "Identifier";
}

function findVariable(
  scope: Scope.Scope,
  name: string,
): Scope.Variable | undefined {
  let current: Scope.Scope | null = scope;

  while (current !== null) {
    const variable = current.set.get(name);

    if (variable !== undefined) {
      return variable;
    }

    current = current.upper;
  }

  return undefined;
}

function getImportInfo(variable: Scope.Variable): ImportInfo | undefined {
  const definition = variable.defs.find(
    (candidate) => candidate.type === "ImportBinding",
  );

  if (definition === undefined) {
    return undefined;
  }

  const source = getStringLiteralValue(definition.parent.source);

  if (source === undefined) {
    return undefined;
  }

  const declarationKind = asKinded(definition.parent).importKind;
  const specifierKind = asKinded(definition.node).importKind;

  return {
    source,
    isTypeOnly: isTypeKind(declarationKind) || isTypeKind(specifierKind),
  };
}

function isDefinitionIdentifier(
  variable: Scope.Variable,
  identifier: IdentifierNode,
): boolean {
  return variable.defs.some(
    (definition) => (definition.name as unknown) === identifier,
  );
}

function isReExportIdentifier(identifier: IdentifierNode): boolean {
  const parent = identifier.parent;

  if (parent.type === "ExportSpecifier") {
    const specifier = parent as unknown as ExportSpecifierNode;
    return specifier.local === identifier;
  }

  if (parent.type === "ExportDefaultDeclaration") {
    const declaration = parent as unknown as ExportDefaultDeclarationNode;

    return declaration.declaration === identifier;
  }

  return false;
}

function isUsedOutsideReExport(variable: Scope.Variable): boolean {
  return variable.references.some((reference) => {
    if (reference.identifier.type !== "Identifier") {
      return true;
    }

    const identifier = reference.identifier as IdentifierNode;

    if (isDefinitionIdentifier(variable, identifier)) {
      return false;
    }

    return !isReExportIdentifier(identifier);
  });
}

function shouldSkipFile(
  filename: string | undefined,
  cwd: string,
  include: readonly string[],
  exclude: readonly string[],
  detectEntrypoints: boolean,
): boolean {
  if (filename === undefined) {
    return include.length > 0;
  }

  const packageInfo = findNearestPackage(path.dirname(filename));
  const packageDirectory = packageInfo?.directory;

  if (
    include.length > 0 &&
    !matchesAnyPattern(filename, include, cwd, packageDirectory)
  ) {
    return true;
  }

  if (matchesAnyPattern(filename, exclude, cwd, packageDirectory)) {
    return true;
  }

  return (
    detectEntrypoints &&
    packageInfo !== undefined &&
    isPackageEntrypoint(filename, packageInfo)
  );
}

function isTypeOnlyExportSpecifier(
  declaration: Kinded,
  specifier: Kinded,
): boolean {
  return isTypeKind(declaration.exportKind) || isTypeKind(specifier.exportKind);
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow re-exports in internal modules so names are imported from the file that defines them.",
      recommended: false,
      url: "https://github.com/joonarafael/eslint-plugin-pet-peeves/blob/master/docs/rules/no-internal-re-exports.md",
    },
    schema: optionSchema,
    messages: {
      reExport:
        "Do not re-export '{{name}}' from '{{source}}'. Import it from the module that defines it.",
      reExportAll:
        "Do not re-export every binding from '{{source}}'. Import bindings from the module that defines them.",
      reExportNamespace:
        "Do not re-export '{{source}}' as '{{name}}'. Import bindings from the module that defines them.",
    },
  },

  create(context) {
    const options = context.options as Options;
    const ignoreTypes = options[0]?.ignoreTypes ?? DEFAULT_IGNORE_TYPES;

    const reportUsedLocals =
      options[0]?.reportUsedLocals ?? DEFAULT_REPORT_USED_LOCALS;

    const detectEntrypoints =
      options[0]?.detectEntrypoints ?? DEFAULT_DETECT_ENTRYPOINTS;

    const include = options[0]?.include ?? [];
    const exclude = options[0]?.exclude ?? [];

    const cwd = getCwd(context);
    const filename = resolveLintFilename(context.filename, cwd);

    if (shouldSkipFile(filename, cwd, include, exclude, detectEntrypoints)) {
      return {};
    }

    const sourceCode = context.sourceCode;

    function reportReExport(
      node: Rule.Node,
      messageId: "reExport" | "reExportAll" | "reExportNamespace",
      name: string,
      source: string,
    ): void {
      context.report({
        node,
        messageId,
        data: { name, source },
      });
    }

    function maybeReportImportedExport(
      node: Rule.Node,
      local: IdentifierNode,
      exportedName: string,
      exportIsTypeOnly: boolean,
    ): void {
      const variable = findVariable(sourceCode.getScope(local), local.name);

      if (variable === undefined) {
        return;
      }

      const importInfo = getImportInfo(variable);

      if (importInfo === undefined) {
        return;
      }

      if (ignoreTypes && (exportIsTypeOnly || importInfo.isTypeOnly)) {
        return;
      }

      if (!reportUsedLocals && isUsedOutsideReExport(variable)) {
        return;
      }

      reportReExport(node, "reExport", exportedName, importInfo.source);
    }

    return {
      ExportAllDeclaration(node): void {
        const declaration = node as unknown as ExportAllDeclarationNode;
        const source = getStringLiteralValue(declaration.source);

        if (source === undefined) {
          return;
        }

        if (ignoreTypes && isTypeKind(declaration.exportKind)) {
          return;
        }

        if (declaration.exported !== null) {
          reportReExport(
            node,
            "reExportNamespace",
            moduleName(declaration.exported),
            source,
          );

          return;
        }

        reportReExport(node, "reExportAll", "*", source);
      },

      ExportNamedDeclaration(node): void {
        const declaration = node as unknown as ExportNamedDeclarationNode;

        const source = getStringLiteralValue(declaration.source);

        if (source !== undefined) {
          if (declaration.specifiers.length === 0) {
            reportReExport(node, "reExport", "*", source);

            return;
          }

          for (const specifier of declaration.specifiers) {
            if (
              ignoreTypes &&
              isTypeOnlyExportSpecifier(declaration, specifier)
            ) {
              continue;
            }

            reportReExport(
              specifier as unknown as Rule.Node,
              "reExport",
              moduleName(specifier.exported),
              source,
            );
          }

          return;
        }

        for (const specifier of declaration.specifiers) {
          if (!isIdentifierNode(specifier.local)) {
            continue;
          }

          maybeReportImportedExport(
            specifier as unknown as Rule.Node,
            specifier.local,
            moduleName(specifier.exported),
            isTypeOnlyExportSpecifier(declaration, specifier),
          );
        }
      },

      ExportDefaultDeclaration(node): void {
        const declaration = node as unknown as ExportDefaultDeclarationNode;

        if (!isIdentifierNode(declaration.declaration)) {
          return;
        }

        maybeReportImportedExport(
          node,
          declaration.declaration,
          "default",
          false,
        );
      },
    };
  },
};

export default rule;
