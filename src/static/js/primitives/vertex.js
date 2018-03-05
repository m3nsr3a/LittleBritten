/**
 * This class represents the dot, on our drawing grid.
 */
class Vertex extends DrawPrimitive {

    /**
     * The default constructor for the Vertex object.
     *
     * board - A reference to the parent game board.
     * x - Horizontal coordinate(a grid coordinate, not a raw pixel location).
     * y - Vertical coordinate(a grid coordinate, not a raw pixel location).
     */
    constructor(board, x, y) {
        super();
        this._board = board;
        this._y = y;
        this._x = x;

        this._owner = null;

        this._radius = 13;
        this._outlineWidth = 1;
        this._outline = 'black';
        this._fill = 'black';
    }

    /**
     * Draws the vertex as a dot on the game board.
     */
    draw() {

        let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

        let xBoard = this.radius + this.board.squareWidth * this.x;
        let yBoard = this.radius + this.board.squareHeight * this.y;

        circle.setAttribute('cx', xBoard.toString());
        circle.setAttribute('cy', yBoard.toString());
        circle.setAttribute('r', this.radius.toString());
        circle.setAttribute('stroke', this.outline.toString());
        circle.setAttribute('stroke-width', this.outlineWidth.toString());
        circle.setAttribute('fill', this.fill.toString());

        /* Set id, for this line, in order to retrieve later. */
        circle.setAttribute(
            'id',
            'vertex-' + this.x + '-' + this.y + '-' + this.radius
        );

        this.board.svg.appendChild(circle);
    }

    /**
     * Mark, that this vector is owned now.
     * Also update the color.
     */
    claimOwnership(owner) {

        if (!this.isOwned) {
            /* Get the element. */
            let circeDOM = document.getElementById(
                'vertex-' + this.x + '-' + this.y + '-' + this.radius
            );

            /* Update it's color and the owner. */
            circeDOM.setAttribute('style', 'stroke: ' + owner.color + ' !important');
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

    get y() {
        return this._y;
    }

    get board() {
        return this._board;
    }

    get radius() {
        return this._radius;
    }

    get outline() {
        return this._outline;
    }

    get outlineWidth() {
        return this._outlineWidth;
    }

    get fill() {
        return this._fill;
    }
}
