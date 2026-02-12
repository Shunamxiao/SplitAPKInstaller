package com.splitapkinstaller.installer;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class SplitInstallerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SplitInstaller";
    private final ReactApplicationContext reactContext;

    public SplitInstallerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SplitInstaller";
    }

    @ReactMethod
    public void installSplitApks(ReadableArray apkPaths, Promise promise) {
        try {
            Context context = reactContext.getApplicationContext();
            PackageInstaller packageInstaller = context.getPackageManager().getPackageInstaller();
            
            PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
                PackageInstaller.SessionParams.MODE_FULL_INSTALL
            );
            
            int sessionId = packageInstaller.createSession(params);
            PackageInstaller.Session session = packageInstaller.openSession(sessionId);
            
            for (int i = 0; i < apkPaths.size(); i++) {
                String apkPath = apkPaths.getString(i);
                File apkFile = new File(apkPath);
                
                if (!apkFile.exists()) {
                    promise.reject("FILE_NOT_FOUND", "APK file not found: " + apkPath);
                    return;
                }
                
                try (InputStream in = new FileInputStream(apkFile);
                     OutputStream out = session.openWrite(apkFile.getName(), 0, apkFile.length())) {
                    byte[] buffer = new byte[65536];
                    int len;
                    while ((len = in.read(buffer)) != -1) {
                        out.write(buffer, 0, len);
                    }
                    session.fsync(out);
                }
            }
            
            Intent intent = new Intent(context, InstallResultReceiver.class);
            intent.setAction("com.splitapkinstaller.INSTALL_RESULT");
            
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags |= PendingIntent.FLAG_MUTABLE;
            }
            
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context, sessionId, intent, flags
            );
            
            session.commit(pendingIntent.getIntentSender());
            promise.resolve(sessionId);
            
        } catch (IOException e) {
            Log.e(TAG, "Installation failed", e);
            promise.reject("INSTALL_FAILED", e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Installation failed", e);
            promise.reject("INSTALL_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void installSingleApk(String apkPath, Promise promise) {
        try {
            Context context = reactContext.getApplicationContext();
            File apkFile = new File(apkPath);
            
            if (!apkFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "APK file not found: " + apkPath);
                return;
            }
            
            Uri apkUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    apkFile
                );
            } else {
                apkUri = Uri.fromFile(apkFile);
            }
            
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            
            context.startActivity(intent);
            promise.resolve(true);
            
        } catch (Exception e) {
            Log.e(TAG, "Installation failed", e);
            promise.reject("INSTALL_FAILED", e.getMessage());
        }
    }
}
