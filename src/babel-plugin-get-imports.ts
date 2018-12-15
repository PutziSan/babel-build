import pluginSyntaxDynamicImport from "@babel/plugin-syntax-dynamic-import";
import { NodePath } from "@babel/traverse";
import {
  CallExpression,
  ExportAllDeclaration,
  ExportNamedDeclaration,
  ExportSpecifier,
  ImportDeclaration,
  ImportSpecifier,
  isExportDefaultSpecifier,
  isExportNamespaceSpecifier,
  isExportSpecifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  isStringLiteral,
  isTemplateLiteral
} from "@babel/types";
import { createNewEvent, either } from "./utils";

function getImportPathFromImportCall(importCall: CallExpression) {
  const [importPathNode] = importCall.arguments;

  if (isTemplateLiteral(importPathNode)) {
    if (importPathNode.expressions.length > 0) {
      throw new Error(
        "expressions in dynamic imports are currently not supported"
      );
    }

    return importPathNode.quasis[0].value.raw;
  } else if (isStringLiteral(importPathNode)) {
    return importPathNode.value;
  }

  throw new Error("dynamic imports can only be used with static strings");
}

export interface ImportInfo {
  importedAll: boolean;
  importedSpecifiers: string[];
  importedPath: string;
}

export function createPlugin() {
  const [onNewImport, fireNewImport] = createNewEvent<[ImportInfo]>();

  const visitor = {
    ImportDeclaration(path: NodePath) {
      const node = path.node as ImportDeclaration;

      const importedAll = node.specifiers.some(
        either(isImportDefaultSpecifier, isImportNamespaceSpecifier)
      );

      const importedSpecifiers = node.specifiers
        .filter(specifier => isImportSpecifier(specifier))
        .map((specifier: ImportSpecifier) => specifier.imported.name);

      const importedPath = node.source.value;

      fireNewImport({ importedAll, importedSpecifiers, importedPath });
    },
    ExportAllDeclaration(path: NodePath) {
      const node = path.node as ExportAllDeclaration;

      fireNewImport({
        importedAll: true,
        importedPath: node.source.value,
        importedSpecifiers: []
      });
    },
    ExportNamedDeclaration(path: NodePath) {
      const node = path.node as ExportNamedDeclaration;

      // ExportSpecifier | ExportDefaultSpecifier | ExportNamespaceSpecifier
      if (!node.source) {
        return;
      }

      const importedAll = node.specifiers.some(
        either(isExportDefaultSpecifier, isExportNamespaceSpecifier)
      );

      const importedSpecifiers = node.specifiers
        .filter(specifier => isExportSpecifier(specifier))
        .map((specifier: ExportSpecifier) => specifier.local.name);

      const importedPath = node.source.value;

      fireNewImport({ importedAll, importedSpecifiers, importedPath });
    },
    Import(path: NodePath) {
      const importCallExpression = path.parentPath.node as CallExpression;

      fireNewImport({
        importedAll: true,
        importedPath: getImportPathFromImportCall(importCallExpression),
        importedSpecifiers: []
      });
    }
  };

  function plugin() {
    return {
      inherits: pluginSyntaxDynamicImport,
      visitor
    };
  }

  return { onNewImport, plugin };
}
