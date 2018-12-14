import pluginSyntaxDynamicImport from "@babel/plugin-syntax-dynamic-import";
import { NodePath } from "@babel/traverse";
import {
  CallExpression,
  callExpression,
  ExportAllDeclaration,
  ExportDeclaration,
  ExportDefaultSpecifier, exportNamedDeclaration,
  ExportNamedDeclaration, ExportNamespaceSpecifier,
  ExportSpecifier,
  ImportDeclaration,
  importDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier, isExportDefaultSpecifier, isExportNamespaceSpecifier, isExportSpecifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  isStringLiteral,
  isTemplateLiteral,
  stringLiteral,
} from '@babel/types';
import { ImportInfo, ModuleInfo } from "./customTypes";
import { either } from "./utils";

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

interface PluginMethods {
  onNewImport(importInfo: ImportInfo): void;
  moduleInfoFromPath(importedPath: string): ModuleInfo;
}

// Es ist wichtig dass `newImportPath` nach n (n ist eine Natürlich Zahl) zyklischen aufrufen Aufrufen mit sich selbst terminiert
export function createPlugin({
  onNewImport,
  moduleInfoFromPath
}: PluginMethods) {
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
      const moduleInfo = moduleInfoFromPath(importedPath);

      onNewImport({
        importedAll,
        importedPath,
        newImportPath: moduleInfo.relativeJsImportPath,
        importedSpecifiers,
        moduleInfo
      });

      const newSrc = moduleInfo.relativeJsImportPath;

      if (newSrc !== importedPath) {
        path.replaceWith(
          importDeclaration(node.specifiers, stringLiteral(newSrc))
        );
      }
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
      const moduleInfo = moduleInfoFromPath(importedPath);

      onNewImport({
        importedAll,
        importedPath,
        newImportPath: moduleInfo.relativeJsImportPath,
        importedSpecifiers,
        moduleInfo
      });

      const newSrc = moduleInfo.relativeJsImportPath;

      if (newSrc !== importedPath) {
        path.replaceWith(
          exportNamedDeclaration(node.declaration, node.specifiers, stringLiteral(newSrc))
        );
      }
    },
    Import(path: NodePath) {
      const importCallExpression = path.parentPath.node as CallExpression;

      const importedPath = getImportPathFromImportCall(importCallExpression);
      const moduleInfo = moduleInfoFromPath(importedPath);

      const newSrc = moduleInfo.relativeJsImportPath;

      // call event before replacing, so that outer handlers can cache handled imports
      onNewImport({
        importedPath,
        moduleInfo,
        newImportPath: moduleInfo.relativeJsImportPath,
        // set always true for dynamic import
        importedAll: true,
        importedSpecifiers: []
      });

      // diese bedingung ist wichtig und gefährlich:
      // durch das replacement wird der babel-traversal `Import(path)` immer wieder aufgerufen
      // `newImportPath` sollte nach n zyklischen aufrufen mit sich selbst irgendwann deterministisch sein und kein geändertes ergebnis mehr bringen
      if (newSrc !== importedPath) {
        path.parentPath.replaceWith(
          callExpression(importCallExpression.callee, [stringLiteral(newSrc)])
        );
      }
    }
  };

  return () => {
    return {
      inherits: pluginSyntaxDynamicImport,
      visitor
    };
  };
}
