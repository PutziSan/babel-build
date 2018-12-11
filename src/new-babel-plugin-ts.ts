import pluginSyntaxDynamicImport from '@babel/plugin-syntax-dynamic-import';
import { NodePath } from '@babel/traverse';
import {
  CallExpression,
  callExpression,
  ImportDeclaration,
  importDeclaration,
  ImportSpecifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  isStringLiteral,
  isTemplateLiteral,
  stringLiteral,
} from '@babel/types';
import { ImportInfo, ModuleInfo } from './customTypes';
import { either } from './utils';


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
  newImportPath(moduleInfo: ModuleInfo, importedPath: string): string;
  moduleInfoFromPath(importedPath: string): ModuleInfo;
}

export function createPlugin({
  onNewImport,
  newImportPath,
  moduleInfoFromPath
}: PluginMethods) {
  return () => {
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

        const newSrc = newImportPath(moduleInfo, importedPath);

        if (newSrc !== importedPath) {
          path.replaceWith(
            importDeclaration(node.specifiers, stringLiteral(newSrc))
          );
        }

        onNewImport({
          importedAll,
          importedPath,
          importedSpecifiers,
          moduleInfo
        });
      },
      Import(path: NodePath) {
        const importCallExpression = path.parentPath.node as CallExpression;

        const importedPath = getImportPathFromImportCall(importCallExpression);
        const moduleInfo = moduleInfoFromPath(importedPath);

        const newSrc = newImportPath(moduleInfo, importedPath);

        if (newSrc !== importedPath) {
          path.parentPath.replaceWith(
            callExpression(importCallExpression.callee, [stringLiteral(newSrc)])
          );
        }

        onNewImport({
          importedPath,
          moduleInfo,
          // set always true for dynamic import
          importedAll: true,
          importedSpecifiers: [],
        });
      }
    };

    return {
      inherits: pluginSyntaxDynamicImport,
      visitor
    };
  };
}
