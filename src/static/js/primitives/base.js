/**
 * This class represents a primitive, that shows, which
 *
 */
class DrawPrimitive {

    /**
     * In order to properly extend this class, without errors, one need to
     *  overwrite the `draw()` method.
     */
    constructor() {
        if (
            (this.draw === undefined || this.claimOwnership === undefined) ||
            (typeof this.draw !== "function" || typeof this.claimOwnership !== "function")
        ) {
            throw new TypeError("Each object that is a DrawPrimitive, must define `draw()` method.");
        }
    }
}