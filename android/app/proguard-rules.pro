# Add project specific ProGuard rules here.

# React Native
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.** { *; }

# Hermes
-keep class com.facebook.hermes.** { *; }

# SoLoader
-keep class com.facebook.soloader.** { *; }

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}
