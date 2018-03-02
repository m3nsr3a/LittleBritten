/**
 *
 *
 * Object is used ONLY for filling in a player's colors when a square is claimed.
 * The actual detection of completed squares is done in Board using Line objects.
 */
class Square extends DrawPrimitive {

    /**
     * The default constructor for the Square object.
     *
     * board - Reference to the parent game board object.
     * x - Raw Ox pixel coordinates inside the SVG element.
     * y - Raw Oy pixel coordinates inside the SVG element
     * offset - extra pixels to add to x and y due to the radius of the left-most
     *             dot pushing things down and right a little.
     */
    constructor(board, x, y, index, offset) {
        super();

        this._renderer = board;
        this._y = y;
        this._x = x;
        this._offset = offset;
        this._index = index;

        this._owner = null;

        /* Default opacity for colored squares. */
        this._opacity = 0.4;
        this._fill = 'black';
    }

    /**
     * Draws the Square as a square, with height and width,
     *  starting from certain offset on the screen.
     */
    draw() {

        let square = document.createElementNS("http://www.w3.org/2000/svg", "rect");

        square.setAttribute('x', this.x * this.board.squareWidth + this.offset);
        square.setAttribute('y', this.y * this.board.squareHeight + this.offset);
        square.setAttribute('width', this.board.squareWidth);
        square.setAttribute('height', this.board.squareHeight);
        square.setAttribute('fill', this.fill);
        square.setAttribute('data-index', this.index);
        square.setAttribute(
            'style', 'opacity: ' + this.opacity + '; fill-opacity: ' + this.opacity + '; stroke-opacity: ' + this.opacity + ';'
        );

        /* Set id, for this square, in order to retrieve later. */
        square.setAttribute(
            'id',
            'square-' + this.x + '-' + this.y
        );

        this.board.svg.appendChild(square);
    }

    /**
     * Mark, that this square is owned now.
     * Also update the color.
     */
    claimOwnership(owner) {

        if (!this.isOwned) {
            /* Get the element. */
            let squareDOM = document.getElementById(
                'square-' + this.x + '-' + this.y + '-' + this.fill
            );

            /* Update it's color and the owner. */
            squareDOM.setAttribute('style', 'stroke: ' + owner.color + ' !important');
            this._owner = owner;
        }
    }

    /* Getter functions for this class. */

    get isOwned() {
        return !!this._owner;
    }

    get owner() {
        return this._owner;
    }

    get x() {
        return this._x;
    }

    get index() {
        return this._index;
    }

    get y() {
        return this._y;
    }

    get board() {
        return this._renderer;
    }

    get offset() {
        return this._offset;
    }

    get fill() {
        return this._fill;
    }

    get opacity() {
        return this._opacity;
    }
}