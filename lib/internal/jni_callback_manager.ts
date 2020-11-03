import { JNIInvocationCallback } from "..";
import { JNIInvocationListener } from "..";
import { JNIInvocationContext } from "..";
import { JNINativeReturnValue } from "..";


class JNICallbackManager {
    private readonly callbacks: Map<string, JNIInvocationCallback>;

    public constructor () {
        this.callbacks = new Map<string, JNIInvocationCallback>();
    }

    public addCallback (
        method: string,
        callback: JNIInvocationCallback
    ): JNIInvocationListener {
        if (!this.callbacks.has(method)) {
            this.callbacks.set(method, callback);
            return new JNIInvocationListener(this.callbacks, method);
        } else {
            throw new Error(
                "Callback already exists for "
                    + method + " please detach first."
            );
        }
    }

    public doBeforeCallback (
        method: string,
        ctx: JNIInvocationContext, 
        args: NativeArgumentValue[]
    ): void {
        if (this.callbacks.has(method)) {
            const cb = this.callbacks.get(method);
            if (cb?.onEnter !== undefined) {
                cb.onEnter.call(ctx, args);
            }
        }
    }

    public doAfterCallback (
        method: string,
        ctx: JNIInvocationContext,
        retval: NativeReturnValue
    ): NativeReturnValue {
        if (this.callbacks.has(method)) {
            const cb = this.callbacks.get(method);
            if (cb?.onLeave !== undefined) {
                const wrappedRet = new JNINativeReturnValue(retval);
                cb.onLeave.call(ctx, wrappedRet);
                if (wrappedRet.get() !== retval) {
                    retval = wrappedRet.get();
                }
            }
        }
        return retval;
    }

    public clear (): void {
        this.callbacks.clear();
    }
}

export { JNICallbackManager };