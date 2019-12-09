# jnitrace-engine

_Engine used by jnitrace to intercept JNI API calls._

`jnitrace-engine` is the project used by jnitrace to intercept and trace JNI API calls. It has been exposed as a separate project to allow Frida module developers to use the same engine to intercept and modify JNI API calls made by Android applications.

## Installation:

The easiest way to get running with `jnitrace-engine` is using npm:

`npm install jnitrace-engine`

## Simple Usage:

`jnitrace-engine` tries to mirror as much of the Frida API as possible. `JNIInterceptor` provides an API to attach to JNI API calls in a very similar way to the Frida `Interceptor`. The idea is to make using the library simple to use for those already familiar with Frida. The examples below are JavaScript but the module also supports TypeScript.

```javascript
import { JNIInterceptor } from "jnitrace-engine";

// Attach to the JNI FindClass method
JNIInterceptor.attach("FindClass", {
    onEnter(args) {
        // called whenever the FindClass is about to be called
        console.log("FindClass method called");
        this.className = Memory.readCString(args[1]);
    },
    onLeave(retval) {
        // called whenever the FindClass method has finished executing
        console.log("\tLoading Class:", this.className);
        console.log("\tClass ID:", retval.get());
    }
});

```

## Advanced Usage:

```TypeScript
import { JNIInterceptor } from "jnitrace-engine";
import { JNILibraryWatcher } from "jnitrace-engine";
import { JNINativeReturnValue } from "jnitrace-engine";
import { ConfigBuilder } from "jnitrace-engine";

// configure the jnitrace-engine to limit what libraries to traces
const builder : ConfigBuilder = new ConfigBuilder();

builder.libraries = [ "libnative-lib.so" ]; // set a list of libraries to track
builder.backtrace = "fuzzy"; // choose the backtracer type to use [accurate/fuzzy/none]
builder.includeExports = [ "Java_com_nativetest_MainActivity_stringFromJNI" ]; // provide a list of library exports to track
builder.excludeExports = []; // provide a list of library exports to ignore
builder.env = true; // set whether to trace the JNIEnv struct or ignore all of it
builder.vm = false; // set whether to trace the JavaVM struct or ignore all of it

const config = builder.build(); //initialise the config - this makes it available to the engine

// An additional callback that can be used for listening to new libraries being loaded by an application
// Note this callback will be called for all libraries, not just the ones in the config
// libraries list
JNILibraryWatcher.setCallback({
    onLoaded(path : string) {
        console.log("Library Loaded " + path);
        console.log("Currently Traced Libraries", JSON.stringify(config.libraries));
    }
});

const findClassIntercept = JNIInterceptor.attach("FindClass", {
    onEnter(args: NativeArgumentValue[]) {
        console.log("Find Class called");
        args[1] = NULL; // Change the arguments to the FindClass function
        console.log("ThreadId", this.threadId);
        console.log("Address of FindClass method", this.jniAddress);
        this.backtrace.forEach((element: NativePointer) => {
            console.log("backtrace", element);
        });
    },
    onLeave(retval: JNINativeReturnValue) {
        // Change the retval to be returned to the caller of FindClass
        retval.replace(NULL);
        // Detach all JNI intercepts
        JNIInterceptor.detatchAll();
    }
});

JNIInterceptor.attach("CallDoubleMethodV", {
    onLeave(retval : JNINativeReturnValue) {
        // Log the method params of the Java method the JNI API is calling.
        // this.javaMethod will only exist if a Java method has been called.
        console.log("Java Method Args", JSON.stringify(this.javaMethod.params));
        // Detach from the FindClass intercept
        findClassIntercept.detach();
    }
});
```
