import { ConfigBuilder } from "./config_builder";

/**
 * Config class to store options for the JNIInterception engine to use.
 */
class Config {
    private static instance: Config | undefined;

    private readonly _libraries: string[];

    private readonly _backtrace: string;

    private readonly _includeExport: string[];

    private readonly _excludeExport: string[];

    private readonly _env: boolean;

    private readonly _vm: boolean;

    private _hostInitialised: boolean;

    private constructor (builder: ConfigBuilder) {
        this._libraries = builder.libraries;
        this._backtrace = builder.backtrace;
        this._includeExport = builder.includeExports;
        this._excludeExport = builder.excludeExports;
        this._env = builder.env;
        this._vm = builder.vm;

        this._hostInitialised = false;
    }

    /**
     * Get a list of libraries the the JNIInterceptor is attempting to trace.
     */
    public get libraries (): string[] {
        return this._libraries;
    }

    /**
     * Get the type of backtrace that the JNIInterceptor should be using for
     * backtraces.
     */
    public get backtrace (): string {
        return this._backtrace;
    }

    /**
     * Get a list of the exports that the jnitrace engine should be
     * intercepting.
     */
    public get includeExport (): string[] {
        return this._includeExport;
    }

    /**
     * Get a list of the exports that the jnitrace engine should not be
     * intercepting.
     */
    public get excludeExport (): string[] {
        return this._excludeExport;
    }

    /**
     * Get whether the jnitrace engine should be tracing the whole JNIEnv
     * struct.
     */
    public get env (): boolean {
        return this._env;
    }

    /**
     * Get whether the jnitrace engine should be tracing the whole JavaVM
     * struct.
     */
    public get vm (): boolean {
        return this._vm;
    }

    /**
     * Returns if the Config has been initialised.
     */
    public static initialised (): boolean {
        if (Config.instance === undefined) {
            return false;
        } else {
            return Config.instance._hostInitialised;
        }
    }

    /**
     * Gets an instance of the Config.
     * 
     * @param builder - an optional builder if the Config needs to be rebuilt.
     */
    public static getInstance (builder?: ConfigBuilder): Config {
        if (builder !== undefined) {
            Config.instance = new Config(builder);
            Config.instance._hostInitialised = true;
        } else if (Config.instance === undefined) {
            Config.instance = new Config(new ConfigBuilder());
        }
        return Config.instance;
    }
}

export { Config };