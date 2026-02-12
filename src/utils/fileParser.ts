import RNFS from 'react-native-fs';
import {unzip} from 'react-native-zip-archive';

export interface ParsedPackage {
  type: 'xapk' | 'apks' | 'apk';
  packageName?: string;
  versionName?: string;
  apkFiles: string[];
  obbFiles: {source: string; target: string}[];
  extractDir: string;
}

export async function parsePackageFile(filePath: string): Promise<ParsedPackage> {
  const fileName = filePath.toLowerCase();
  const extractDir = `${RNFS.CachesDirectoryPath}/extract_${Date.now()}`;

  await RNFS.mkdir(extractDir);

  if (fileName.endsWith('.xapk')) {
    return parseXapk(filePath, extractDir);
  } else if (fileName.endsWith('.apks') || fileName.endsWith('.apkm')) {
    return parseApks(filePath, extractDir);
  } else if (fileName.endsWith('.apk')) {
    return {
      type: 'apk',
      apkFiles: [filePath],
      obbFiles: [],
      extractDir: '',
    };
  }

  throw new Error('Unsupported file format');
}

async function parseXapk(
  filePath: string,
  extractDir: string,
): Promise<ParsedPackage> {
  await unzip(filePath, extractDir);

  const manifestPath = `${extractDir}/manifest.json`;
  let packageName: string | undefined;
  let versionName: string | undefined;

  if (await RNFS.exists(manifestPath)) {
    const manifestContent = await RNFS.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    packageName = manifest.package_name;
    versionName = manifest.version_name;
  }

  const files = await RNFS.readDir(extractDir);
  const apkFiles: string[] = [];
  const obbFiles: {source: string; target: string}[] = [];

  for (const file of files) {
    if (file.name.endsWith('.apk')) {
      apkFiles.push(file.path);
    } else if (file.name.endsWith('.obb')) {
      if (packageName) {
        obbFiles.push({
          source: file.path,
          target: `${RNFS.ExternalStorageDirectoryPath}/Android/obb/${packageName}/${file.name}`,
        });
      }
    }
  }

  // Check for Android folder (some XAPK have obb in Android/obb subfolder)
  const androidObbDir = `${extractDir}/Android/obb`;
  if (await RNFS.exists(androidObbDir)) {
    const obbDirs = await RNFS.readDir(androidObbDir);
    for (const dir of obbDirs) {
      if (dir.isDirectory()) {
        const obbFilesInDir = await RNFS.readDir(dir.path);
        for (const obbFile of obbFilesInDir) {
          if (obbFile.name.endsWith('.obb')) {
            obbFiles.push({
              source: obbFile.path,
              target: `${RNFS.ExternalStorageDirectoryPath}/Android/obb/${dir.name}/${obbFile.name}`,
            });
          }
        }
      }
    }
  }

  return {
    type: 'xapk',
    packageName,
    versionName,
    apkFiles,
    obbFiles,
    extractDir,
  };
}

async function parseApks(
  filePath: string,
  extractDir: string,
): Promise<ParsedPackage> {
  await unzip(filePath, extractDir);

  const files = await RNFS.readDir(extractDir);
  const apkFiles: string[] = [];

  for (const file of files) {
    if (file.name.endsWith('.apk')) {
      apkFiles.push(file.path);
    }
  }

  // Sort to ensure base.apk is first
  apkFiles.sort((a, b) => {
    if (a.includes('base')) return -1;
    if (b.includes('base')) return 1;
    return 0;
  });

  return {
    type: 'apks',
    apkFiles,
    obbFiles: [],
    extractDir,
  };
}

export async function copyObbFiles(
  obbFiles: {source: string; target: string}[],
): Promise<void> {
  for (const obb of obbFiles) {
    const targetDir = obb.target.substring(0, obb.target.lastIndexOf('/'));
    await RNFS.mkdir(targetDir);
    await RNFS.copyFile(obb.source, obb.target);
  }
}

export async function cleanupExtractDir(extractDir: string): Promise<void> {
  if (extractDir && (await RNFS.exists(extractDir))) {
    await RNFS.unlink(extractDir);
  }
}
