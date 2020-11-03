import { Types } from "./types";

const SEMI_COLON_OFFSET = 1;

/**
 * Abstracts a Java method referenced in native code.
 */
class JavaMethod {
    private readonly _: string;

    private readonly _params: string[];

    private readonly _ret: string;

    public constructor (signature: string) {
        const primitiveTypes = ["B", "S", "I", "J", "F", "D", "C", "Z", "V"];
        let isArray = false;
        let isRet = false;

        const jParamTypes: string[] = [];
        let jRetType = "unknown";

        for (var i = 0; i < signature.length; i++) {
            if (signature.charAt(i) === "(") {
                continue;
            }

            if (signature.charAt(i) === ")") {
                isRet = true;
                continue;
            }

            if (signature.charAt(i) === "[") {
                isArray = true;
                continue;
            }

            let jtype = "unknown";

            if (primitiveTypes.includes(signature.charAt(i))) {
                jtype = signature.charAt(i);
            } else if (signature.charAt(i) === "L") {
                var end = signature.indexOf(";", i) + SEMI_COLON_OFFSET;
                jtype = signature.substring(i, end);
                i = end - SEMI_COLON_OFFSET;
            }

            //TODO DELETE
            if (isArray) {
                jtype = "[" + jtype;
            }

            if (!isRet) {
                jParamTypes.push(jtype);
            } else {
                jRetType = jtype;
            }

            isArray = false;
        }

        this._ = signature;
        this._params = jParamTypes;
        this._ret = jRetType;
    }

    /**
     * Get the Java param types for the method.
     */
    public get params (): string[] {
        return this._params;
    }

    /**
     * Get the Java param types as native jtypes.
     */
    public get nativeParams (): string[] {
        const nativeParams: string[] = [];
        this._params.forEach((p: string): void => {
            const nativeJType = Types.convertJTypeToNativeJType(p);

            nativeParams.push(nativeJType);
        });
        return nativeParams;
    }

    /**
     * Get the Java params as Frida native types.
     */
    public get fridaParams (): string[] {
        const fridaParams: string[] = [];
        this._params.forEach((p: string): void => {
            const nativeJType = Types.convertJTypeToNativeJType(p);
            const fridaType = Types.convertNativeJTypeToFridaType(nativeJType);

            fridaParams.push(fridaType);
        });
        return fridaParams;
    }

    /**
     * Get the Java return type of the method.
     */
    public get ret (): string {
        return this._ret;
    }

    /**
     * Get the Java return type as a Frida native type.
     */
    public get fridaRet (): string {
        const jTypeRet = Types.convertJTypeToNativeJType(this._ret);
        return Types.convertNativeJTypeToFridaType(jTypeRet);
    }
}

export { JavaMethod };
