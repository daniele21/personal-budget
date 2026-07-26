# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Capacitor invokes plugin methods through its bridge contract.
-keep class com.staituned.aura.** extends com.getcapacitor.Plugin { *; }

# Release builds must not retain dynamic Android log calls. Debug builds are
# unaffected because these rules run only with release minification.
-assumenosideeffects class android.util.Log {
    public static *** v(...);
    public static *** d(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
    public static *** wtf(...);
}

-renamesourcefileattribute SourceFile
