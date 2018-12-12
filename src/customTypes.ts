export enum ModuleType {
  nodeModule = "nodeModule",
  customModule = "customModule"
}

export interface PackageInfo {
  // path to the directory of the node-package
  path: string;
  // path to the default export (for modules)
  defaultFilePath: string;
  packageName: string;
}

export interface NodeModuleInfo extends PackageInfo {
  type: ModuleType.nodeModule;
  filePath: string;
  relativeJsImportPath: string;
}

export interface CustomModuleInfo {
  type: ModuleType.customModule;
  filePath: string;
  relativeJsImportPath: string;
}

export type ModuleInfo = NodeModuleInfo | CustomModuleInfo;

export interface ImportInfo {
  moduleInfo: ModuleInfo;
  importedPath: string;
  newImportPath: string;
  importedSpecifiers: string[];
  importedAll: boolean;
}

export interface SrcEvents {
  onNewSrc(path: string): void;
  onUnlink(path: string): void;
  onChange(outputPath: string): void;
}
