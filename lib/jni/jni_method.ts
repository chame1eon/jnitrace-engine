/**
 * Contains a definition of the JNI API method.
 */
class JNIMethod {
    /**
     * JNI API call method name.
     */
    public readonly name: string;

    /**
     * List of the argument types for the JNI API call.
     */
    public readonly args: string[];

    /**
     * Return type of the JNI API call.
     */
    public readonly ret: string;

    private constructor (name: string, args: string[], ret: string) {
        this.name = name;
        this.args = args;
        this.ret = ret;
    }
}

export { JNIMethod };