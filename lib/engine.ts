import { ReferenceManager } from "./utils/reference_manager";
import { Config } from "./utils/config";

import { JNIEnvInterceptor } from "./jni/jni_env_interceptor";
import { JNIEnvInterceptorX86 } from "./jni/x86/jni_env_interceptor_x86";
import { JNIEnvInterceptorX64 } from "./jni/x64/jni_env_interceptor_x64";
import { JNIEnvInterceptorARM } from "./jni/arm/jni_env_interceptor_arm";
import { JNIEnvInterceptorARM64 } from "./jni/arm64/jni_env_interceptor_arm64";

import { JavaVMInterceptor } from "./jni/java_vm_interceptor";
import { JNIThreadManager } from "./jni/jni_thread_manager";

import { JNICallbackManager } from "./internal/jni_callback_manager";

import { JNILibraryWatcher } from ".";


export function run (callbackManager: JNICallbackManager): void {
    const JNI_ENV_INDEX = 0;
    const JAVA_VM_INDEX = 0;
    const LIB_TRACK_FIRST_INDEX = 0;
    
    const threads = new JNIThreadManager();
    const references = new ReferenceManager();
    
    let jniEnvInterceptor: JNIEnvInterceptor | undefined = undefined;
    if (Process.arch === "ia32") {
        jniEnvInterceptor = new JNIEnvInterceptorX86(
            references, threads, callbackManager
        );
    } else if (Process.arch === "x64") {
        jniEnvInterceptor = new JNIEnvInterceptorX64(
            references, threads, callbackManager
        );
    } else if (Process.arch === "arm") {
        jniEnvInterceptor = new JNIEnvInterceptorARM(
            references, threads, callbackManager
        );
    } else if (Process.arch === "arm64") {
        jniEnvInterceptor = new JNIEnvInterceptorARM64(
            references, threads, callbackManager
        );
    }
    
    if (jniEnvInterceptor === undefined) {
        throw new Error(
            Process.arch + " currently unsupported, please file an issue."
        );
    }
    
    const javaVMInterceptor = new JavaVMInterceptor(
        references,
        threads,
        jniEnvInterceptor,
        callbackManager
    );
    
    jniEnvInterceptor.setJavaVMInterceptor(javaVMInterceptor);
    
    const trackedLibs: Map<string, boolean> = new Map<string, boolean>();
    const libBlacklist: Map<string, boolean> = new Map<string, boolean>();
    
    
    function checkLibrary (path: string): boolean {
        const EMPTY_ARRAY_LENGTH = 0;
        const ONE_ELEMENT_ARRAY_LENGTH = 1;
    
        let willFollowLib = false;

        if (path === null) {
            return false;
        }
    
        JNILibraryWatcher.doCallback(path);

        const config = Config.getInstance();
    
        if (config.libraries.length === ONE_ELEMENT_ARRAY_LENGTH) {
            if (config.libraries[LIB_TRACK_FIRST_INDEX] === "*") {
                willFollowLib = true;
            }
        }
    
        if (!willFollowLib) {
            willFollowLib = config.libraries.filter(
                (l: string): boolean => path.includes(l)
            ).length > EMPTY_ARRAY_LENGTH;
        }
    
        return willFollowLib;
    }
    
    function interceptJNIOnLoad (jniOnLoadAddr: NativePointer): InvocationListener {
        return Interceptor.attach(jniOnLoadAddr, {
            onEnter (args: NativePointer[]): void {
                let shadowJavaVM = NULL;
                const javaVM = ptr(args[JAVA_VM_INDEX].toString());
    
                if (!threads.hasJavaVM()) {
                    threads.setJavaVM(javaVM);
                }
    
                if (!javaVMInterceptor.isInitialised()) {
                    shadowJavaVM = javaVMInterceptor.create();
                } else {
                    shadowJavaVM = javaVMInterceptor.get();
                }
    
                args[JAVA_VM_INDEX] = shadowJavaVM;
            }
        });
    }
    
    function interceptJNIFunction (jniFunctionAddr: NativePointer): InvocationListener {
        return Interceptor.attach(jniFunctionAddr, {
            onEnter (args: NativePointer[]): void {
                if (jniEnvInterceptor === undefined) {
                    return;
                }
    
                const threadId = this.threadId;
                const jniEnv = ptr(args[JNI_ENV_INDEX].toString());
    
                let shadowJNIEnv = NULL;
    
                threads.setJNIEnv(threadId, jniEnv);
    
                if (!jniEnvInterceptor.isInitialised()) {
                    shadowJNIEnv = jniEnvInterceptor.create();
                } else {
                    shadowJNIEnv = jniEnvInterceptor.get();
                }
    
                args[JNI_ENV_INDEX] = shadowJNIEnv;
            }
        });
    }
    
    const dlopenRef = Module.findExportByName(null, "dlopen");
    const dlsymRef = Module.findExportByName(null, "dlsym");
    const dlcloseRef = Module.findExportByName(null, "dlclose");
    
    if (dlopenRef !== null && dlsymRef !== null && dlcloseRef !== null) {
        const HANDLE_INDEX = 0;
    
        const dlopen = new NativeFunction(dlopenRef, "pointer", ["pointer", "int"]);
        Interceptor.replace(dlopen, new NativeCallback((filename: NativePointer, mode: number): NativeReturnValue => {
            const path = filename.readCString();
            const retval = dlopen(filename, mode);
    
            if (path !== null) {
                if (checkLibrary(path)) {
                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                    trackedLibs.set(retval.toString(), true);
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                    libBlacklist.set(retval.toString(), true);
                }
            }

            return retval;
        }, "pointer", ["pointer", "int"]));
    
        const dlsym = new NativeFunction(dlsymRef, "pointer", ["pointer", "pointer"]);
        Interceptor.attach(dlsym, {
            onEnter (args: NativePointer[]): void {
                const SYMBOL_INDEX = 1;
    
                this.handle = ptr(args[HANDLE_INDEX].toString());
    
                if (libBlacklist.has(this.handle)) {
                    return;
                }
    
                this.symbol = args[SYMBOL_INDEX].readCString();
            },
            onLeave (retval: NativePointer): void {
                if (retval.isNull() || libBlacklist.has(this.handle)) {
                    return;
                }
    
                const config = Config.getInstance();
                const EMPTY_ARRAY_LEN = 0;
    
                if (config.includeExport.length > EMPTY_ARRAY_LEN) {
                    const included = config.includeExport.filter(
                        (i: string): boolean => (this.symbol as string).includes(i)
                    );
                    if (included.length === EMPTY_ARRAY_LEN) {
                        return;
                    }
                }
                if (config.excludeExport.length > EMPTY_ARRAY_LEN) {
                    const excluded = config.excludeExport.filter(
                        (e: string): boolean => (this.symbol as string).includes(e)
                    );
                    if (excluded.length > EMPTY_ARRAY_LEN) {
                        return;
                    }
                }
    
                if (!trackedLibs.has(this.handle)) {
                    // Android 7 and above miss the initial dlopen call.
                    // Give it another chance in dlsym.
                    const mod = Process.findModuleByAddress(retval);
                    if (mod !== null && checkLibrary(mod.path)) {
                        trackedLibs.set(this.handle, true);
                    }
                }
    
                if (trackedLibs.has(this.handle)) {
                    const symbol = this.symbol as string;
                    if (symbol === "JNI_OnLoad") {
                        interceptJNIOnLoad(ptr(retval.toString()));
                    } else if (symbol.startsWith("Java_")) {
                        interceptJNIFunction(ptr(retval.toString()));
                    }
                } else  {
                    let name = config.libraries[HANDLE_INDEX];
    
                    if (name !== "*") {
                        const mod = Process.findModuleByAddress(retval);
                        if (mod === null) {
                            return;
                        }
                        name = mod.name;
                    }

                    if (/lib.+\.so/.exec(name) === null) {
                        return;
                    }

                    if (config.libraries.includes(name) || name === "*") {
                        interceptJNIFunction(ptr(retval.toString()));
                    }
                }
            }
        });
    
        const dlclose = new NativeFunction(dlcloseRef, "int", ["pointer"]);
        Interceptor.attach(dlclose, {
            onEnter (args: NativePointer[]): void {
                const handle = args[HANDLE_INDEX].toString();
                if (trackedLibs.has(handle)) {
                    this.handle = handle;
                }
            },
            onLeave (retval: NativePointer): void {
                if (this.handle !== undefined) {
                    if (retval.isNull()) {
                        trackedLibs.delete(this.handle);
                    }
                }
            }
        });
    }
}
