import { JNIThreadManager } from "./jni_thread_manager";
import { JNIEnvInterceptor } from "./jni_env_interceptor";
import { JavaVM } from "./java_vm";

import { Types } from "../utils/types";
import { ReferenceManager } from "../utils/reference_manager";
import { JNICallbackManager } from "../internal/jni_callback_manager";
import { JNIInvocationContext } from "../";
import { Config } from "../utils/config";

const JAVA_VM_INDEX = 0;
const JNI_OK = 0;
const JNI_ENV_INDEX = 1;

class JavaVMInterceptor {
    private readonly references: ReferenceManager;

    private readonly threads: JNIThreadManager;

    private readonly jniEnvInterceptor: JNIEnvInterceptor;

    private readonly callbackManager: JNICallbackManager;

    private shadowJavaVM: NativePointer;

    public constructor (
        references: ReferenceManager,
        threads: JNIThreadManager,
        jniEnvInterceptor: JNIEnvInterceptor,
        callbackManager: JNICallbackManager
    ) {
        this.references = references;
        this.threads = threads;
        this.jniEnvInterceptor = jniEnvInterceptor;
        this.callbackManager = callbackManager;

        this.shadowJavaVM = NULL;
    }

    public isInitialised (): boolean {
        return !this.shadowJavaVM.isNull();
    }

    public get (): NativePointer {
        return this.shadowJavaVM;
    }

    public create (): NativePointer {
        const javaVMOffset = 3;
        const javaVMLength = 8;
        const javaVM = this.threads.getJavaVM();

        const newJavaVMStruct = Memory.alloc(Process.pointerSize * javaVMLength);
        this.references.add(newJavaVMStruct);

        const newJavaVM = Memory.alloc(Process.pointerSize);
        newJavaVM.writePointer(newJavaVMStruct);

        for (let i = javaVMOffset; i < javaVMLength; i++) {
            const offset = i * Process.pointerSize;
            const javaVMStruct = javaVM.readPointer();
            const methodAddr = javaVMStruct.add(offset).readPointer();

            const callback = this.createJavaVMIntercept(i, methodAddr);
            const trampoline = this.jniEnvInterceptor.createStubFunction();
            this.references.add(trampoline);
            // ensure the CpuContext will be populated
            Interceptor.replace(trampoline, callback);
            newJavaVMStruct.add(offset).writePointer(trampoline);
        }

        this.shadowJavaVM = newJavaVM;

        return newJavaVM;
    }

    private createJavaVMIntercept (
        id: number,
        methodAddr: NativePointer
    ): NativeCallback {
        const self = this;
        const method = JavaVM.getInstance().methods[id];
        const config = Config.getInstance();
        const fridaArgs = method.args.map(
            (a: string): string => Types.convertNativeJTypeToFridaType(a)
        );
        const fridaRet = Types.convertNativeJTypeToFridaType(method.ret);


        const nativeFunction = new NativeFunction(methodAddr, fridaRet, fridaArgs);
        const nativeCallback = new NativeCallback(function (
            this: InvocationContext
        ): NativeReturnValue {
            const threadId = this.threadId;
            const javaVM = self.threads.getJavaVM();

            let localArgs: NativePointer[] = [].slice.call(arguments);
            let jniEnv: NativePointer = NULL;

            localArgs[JAVA_VM_INDEX] = javaVM;

            const ctx: JNIInvocationContext = {
                methodDef: method,
                jniAddress: methodAddr,
                threadId: threadId
            };
            
            if (config.backtrace === "accurate") {
                ctx.backtrace = Thread.backtrace(this.context, Backtracer.ACCURATE);
            } else if (config.backtrace === "fuzzy") {
                ctx.backtrace = Thread.backtrace(this.context, Backtracer.FUZZY);
            }

            self.callbackManager.doBeforeCallback(method.name, ctx, localArgs);

            let ret = nativeFunction.apply(null, localArgs);

            ret = self.callbackManager.doAfterCallback(method.name, ctx, ret);

            if (method.name === "GetEnv" ||
                    method.name === "AttachCurrentThread" ||
                    method.name === "AttachCurrentThreadAsDaemon"
            ) {

                if (ret === JNI_OK) {
                    self.threads.setJNIEnv(
                        threadId, localArgs[JNI_ENV_INDEX].readPointer()
                    );
                }

                if (!self.jniEnvInterceptor.isInitialised()) {
                    jniEnv = self.jniEnvInterceptor.create();
                } else {
                    jniEnv = self.jniEnvInterceptor.get();
                }

                localArgs[JNI_ENV_INDEX].writePointer(jniEnv);
            }

            return ret;
        } as NativeCallbackImplementation, fridaRet, fridaArgs);

        this.references.add(nativeCallback);

        return nativeCallback;
    }
}

export { JavaVMInterceptor };
