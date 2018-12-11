export enum ModuleType {
  nodeModule = "nodeModule",
  customModule = "customModule"
}

export interface PackageInfo {
  type: ModuleType.nodeModule;
  // path to the directory of the node-package
  path: string;
  // path to the default export (for modules)
  defaultFilePath: string;
  packageName: string;
}

export interface NodeModuleInfo extends PackageInfo{
  filePath: string;
}

export interface CustomModuleInfo {
  type: ModuleType.customModule;
  filePath: string;
}

export type ModuleInfo = NodeModuleInfo | CustomModuleInfo;

export interface ImportInfo {
  moduleInfo: ModuleInfo;
  importedPath: string;
  importedSpecifiers: string[];
  importedAll: boolean;
}
