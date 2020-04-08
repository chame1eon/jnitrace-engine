class ReferenceManager {
    private readonly references: Map<string, NativePointer>;

    public constructor () {
        this.references = new Map<string, NativePointer>();
    }

    public add (ref: NativePointer): void {
        this.references.set(ref.toString(), ref);
    }

    public release (ref: NativePointer): void {
        if (this.references.has(ref.toString())) {
            this.references.delete(ref.toString());
        }
    }
}

export { ReferenceManager };
