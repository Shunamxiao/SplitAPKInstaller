# Split APK Installer

一个简洁的 Android 应用，用于安装 Split APK、XAPK、APKS 格式的安装包。

## 功能

- ✅ 支持标准 APK 安装
- ✅ 支持 XAPK 格式（APK + OBB）
- ✅ 支持 APKS/APKM 格式（Split APKs）
- ✅ 自动解压和解析安装包
- ✅ 自动复制 OBB 数据文件
- ✅ 使用 Android PackageInstaller API 安装 Split APKs

## 下载

从 [Releases](https://github.com/Shunamxiao/SplitAPKInstaller/releases) 页面下载最新 APK。

## 技术栈

- React Native 0.73
- TypeScript
- react-native-document-picker
- react-native-zip-archive
- react-native-fs
- Android PackageInstaller API (原生模块)

## 构建

```bash
# 安装依赖
npm install

# 构建 Release APK
cd android && ./gradlew assembleRelease
```

APK 输出路径: `android/app/build/outputs/apk/release/app-release.apk`

## 权限说明

- `READ_EXTERNAL_STORAGE` - 读取安装包文件
- `WRITE_EXTERNAL_STORAGE` - 复制 OBB 文件
- `REQUEST_INSTALL_PACKAGES` - 安装应用
- `MANAGE_EXTERNAL_STORAGE` - Android 11+ 访问 OBB 目录

## License

MIT
