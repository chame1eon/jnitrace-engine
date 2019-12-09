import JNI_ENV_METHODS from "../data/jni_env.json";
import JAVA_VM_METHODS from "../data/java_vm.json";

import { JNIMethod } from "../jni/jni_method";
import { JavaMethod } from "../utils/java_method";

/**
 * Callback type for JNI API call events.
 */
interface JNIInvocationCallback {
    /**
     * Called whenever a JNI API call is about to run. Arguments to that JNI API
     * call can be modified by replacing values in the `args` array.
     */
    onEnter?: (this : JNIInvocationContext, args : NativeArgumentValue[]) => void;

    /**
     * Called immediately after a JNI API has run. The return value from that
     * function can be changed by using JNINativeReturnValue#replace on the
     * retval.
     */
    onLeave?: (this : JNIInvocationContext, retval : JNINativeReturnValue) => void;
}

/**
 * Callback for whenever a native library is loaded.
 */
interface JNILibraryCallback {
    /**
     * Called when a library is loaded.
     */
    onLoaded?: (library : string) => void;
}

/**
 * Context for a JNI API call.
 */
interface JNIInvocationContext {
    /**
     * Backtrace as a list of NativePointers.
     */
    backtrace: NativePointer[];

    /**
     * Id of the thread the JNI API was made from.
     */
    threadId: ThreadId;

    /**
     * Address in memory of the actual JNI API call.
     */
    jniAddress: NativePointer;

    /**
     * Definition of the JNI method.
     */
    methodDef: JNIMethod;

    /**
     * Definition of the Java method. If the function was a "Call" method.
     */
    javaMethod: JavaMethod;

    /**
     * User defined values.
     */
    [x: string]: any
}

/**
 * Wrapper class for return values from a traced JNI API call.
 */
class JNINativeReturnValue {
    private value : NativeReturnValue;

    constructor(value : NativeReturnValue) {
        this.value = value;
    }
    
    /**
     * Get the return value of the JNI call.
     */
    public get(): NativeReturnValue {
        return this.value;
    }
    
    /**
     * Replace the value returned by the JNI API call. Using replace
     * will change the return of the callee to the provided value.
     * 
     * @param value - the new value that should be returned
     */
    public replace(value : NativeReturnValue) {
        this.value = value;
    }
};

/**
 * Listener on a JNI API intercept. Allows that intercept to later
 * be stopped.
 */
class JNIInvocationListener {
    private callbacks: Map<string, JNIInvocationCallback>;
    private method: string;

    constructor(callbacks: Map<string, JNIInvocationCallback>, method: string) {
        this.callbacks = callbacks;
        this.method = method;
    }

    /**
     * Detatch the JNI API intercept.
     */
    public detach() {
        if (this.callbacks.has(this.method)) {
            this.callbacks.delete(this.method);
        }
    }
}

class JNICallbackManager {
    private callbacks : Map<string, JNIInvocationCallback>;

    constructor() {
        this.callbacks = new Map();
    }

    addCallback(method : string, callback : JNIInvocationCallback) {
        if (!this.callbacks.has(method)) {
            this.callbacks.set(method, callback);
            return new JNIInvocationListener(this.callbacks, method);
        } else {
            throw new Error("Callback already exists for " + method + " please detach first.");
        }
    }

    doBeforeCallback(
        method : string,
        ctx : JNIInvocationContext, 
        args : NativeArgumentValue[]
    ): void {
        if (this.callbacks.has(method)) {
            const cb = this.callbacks.get(method);
            if (cb !== undefined && cb.onEnter) {
                cb.onEnter.call(ctx, args);
            }
        }
    }

    doAfterCallback(method : string, ctx : JNIInvocationContext, retval : NativeReturnValue): NativeReturnValue {
        if (this.callbacks.has(method)) {
            const cb = this.callbacks.get(method);
            if (cb !== undefined && cb.onLeave) {
                const wrappedRet = new JNINativeReturnValue(retval);
                cb.onLeave.call(ctx, wrappedRet);
                if (wrappedRet.get() !== retval) {
                    retval = wrappedRet.get();
                }
            }
        }
        return retval;
    }

    clear() {
        this.callbacks.clear();
    }
}

/**
 * Intercepts JNI API calls through the Frida Interceptor. This module is
 * designed to mirror closely the syntax and semantics of the Frida
 * Interceptor.
 */
class JNIInterceptorImpl {
    private callbackManager : JNICallbackManager;

    constructor(callbackManager: JNICallbackManager) {
        this.callbackManager = callbackManager;
    }

    /**
     * Intercepts calls to the given JNI API `method`. This method must be the
     * name of the a method in either the JNIEnv struct or the JavaVM struct.
     * 
     * 
     * @param method - name of the JNI method to intercept
     * @param callback - a callback with an onEnter and/or onLeave
     * @returns a listener object to detach the intercept
     */
    public attach(method: string, callback : JNIInvocationCallback): JNIInvocationListener {
        for (let i = 4; i < JNI_ENV_METHODS.length; i++) {
            const element = JNI_ENV_METHODS[i];
            if (element.name === method) {
                return this.callbackManager.addCallback(method, callback);
            }
        }

        for (let i = 3; i < JAVA_VM_METHODS.length; i++) {
            const element = JAVA_VM_METHODS[i];
            if (element.name === method) {
                return this.callbackManager.addCallback(method, callback);
            }
        }

        throw new Error("Method name (" + method + ") is not a valid JNI method.");
    };

    /**
     * Detatch all current JNIIntercepts.
     */
    public detatchAll() {
        this.callbackManager.clear();
    };
}

class JNILibraryWatcherImpl {
    private callback : JNILibraryCallback | undefined;

    /**
     * Set a callback to listen to new library loaded events. The callback
     * will be triggered whenever a new library load is detected by JNI trace.
     * The callback will provide the full path to the library being loaded.
     * 
     * @param callback - the listener for library load events
     */
    public setCallback(callback : JNILibraryCallback) {
        this.callback = callback;
    }

    doCallback(library : string) {
        if (this.callback !== undefined
                && this.callback.onLoaded !== undefined) {
            this.callback.onLoaded(library);
        }
    }
}

export { 
    JNIInterceptorImpl,
    JNILibraryWatcherImpl,
    JNIInvocationCallback,
    JNIInvocationListener,
    JNIInvocationContext,
    JNINativeReturnValue,
    JNICallbackManager 
}