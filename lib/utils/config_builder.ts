import { Config } from "./config";

/**
 * ConfigBuilder class for creating the immutable Config.
 */
class ConfigBuilder {
    private _libraries: string[];

    private _backtrace: string;

    private _includeExports: string[];

    private _excludeExports: string[];

    private _env: boolean;

    private _vm: boolean;

    public constructor () {
        this._libraries = ["*"];
        this._backtrace = "accurate";
        this._includeExports = [];
        this._excludeExports = [];
        this._env = true;
        this._vm = true;
    }

    /**
     * A list of libraries that the jnitrace engine should trace.
     */
    public set libraries (libraries: string[]) {
        this._libraries = libraries;
    }

    /**
     * Get the list of libraries that the jnitrace engine should be tracing.
     */
    public get libraries (): string[] {
        return this._libraries;
    }

    /**
     * Set the Frida backtrace method that the jnitrace engine should use.
     */
    public set backtrace (backtrace: string) {
        if (["fuzzy", "accurate", "none"].includes(backtrace)) {
            this._backtrace = backtrace;
        } else {
            throw new Error(
                "Backtracer value must be one of the following, [fuzzy, accurate, none]."
            );
        }
    }

    /**
     * Get the Frida backtrace method that the jnitrace engine should use.
     */
    public get backtrace (): string {
        return this._backtrace;
    }

    /**
     * Set the list of exports that the jnitrace engine should trace.
     */
    public set includeExports (exports: string[]) {
        this._includeExports = exports;
    }

    /**
     * Get the list of exports that the jnitrace engine should trace.
     */
    public get includeExports (): string[] {
        return this._includeExports;
    }

    /**
     * Set the list of exports that the jnitrace engine should not trace.
     */
    public set excludeExports (exports: string[]) {
        this._excludeExports = exports;
    }

    /**
     * Get the list of exports that the jnitrace engine should not tracqe.
     */
    public get excludeExports (): string[] {
        return this._excludeExports;
    }

    /**
     * Set whether the jnitrace engine should or should not trace JNIEnv struct
     * method calls.
     */
    public set env (env: boolean) {
        this._env = env;
    }

    /**
     * Get whether the jnitrace engine should or should not trace JNIEnv struct
     * method calls.
     */
    public get env (): boolean {
        return this._env;
    }

    /**
     * Set whether the jnitrace engine should or should not trace JavaVM struct
     * method calls.
     */
    public set vm (vm: boolean) {
        this._vm = vm;
    }

    /**
     * Get whether the jnitrace engine should or should not trace JavaVM struct
     * method calls.
     */
    public get vm (): boolean {
        return this._vm;
    }

    /**
     * Build the Config to be used by the jnitrace engine.
     */
    public build (): Config {
        return Config.getInstance(this);
    }
}

export { ConfigBuilder };