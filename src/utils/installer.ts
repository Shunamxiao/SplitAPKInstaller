import {NativeModules} from 'react-native';

const {SplitInstaller} = NativeModules;

export interface InstallerModule {
  installSplitApks(apkPaths: string[]): Promise<number>;
  installSingleApk(apkPath: string): Promise<boolean>;
}

export const installer: InstallerModule = SplitInstaller;

export async function installPackage(apkFiles: string[]): Promise<void> {
  if (apkFiles.length === 0) {
    throw new Error('No APK files to install');
  }

  if (apkFiles.length === 1) {
    await installer.installSingleApk(apkFiles[0]);
  } else {
    await installer.installSplitApks(apkFiles);
  }
}
