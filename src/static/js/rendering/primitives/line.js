/**
 * This object represents the line segment on the board.
 * May be claimed by other players.
 */
class Line extends DrawPrimitive {

    /**
     * The default constructor for the Line object.
     *
     * board - Reference to the parent game board.
     * type - Specifies type of line. Either `horizontal` or `vertical`.
     * index - array location of the line in the game board's array of lines
     * vertex1 - One of Vertex objects that define the Line.
     * vertex2 - Other Vertex object that define the Line.
     */
    constructor(board, type, index, vertex1, vertex2) {
        super();

        this._renderer = board;
        this._type = type;
        this._index = index;
        this._vertex1 = vertex1;
        this._vertex2 = vertex2;

        this._owner = null;

        this._outline = 'black';
        this._fill = 'black';
    }

    /**
     * Draws the Line as a straight between two dots.
     */
    draw() {

        let that = this;
        let line = document.createElementNS("http://www.w3.org/2000/svg", "line");

        line.setAttribute('class', 'segment');
        line.setAttribute('data-index', this.index);

        line.setAttribute('x1', this.vertex1.radius + this.vertex1.x * this.board.squareWidth);
        line.setAttribute('y1', this.vertex1.radius + this.vertex1.y * this.board.squareHeight);
        line.setAttribute('x2', this.vertex2.radius + this.vertex2.x * this.board.squareWidth);
        line.setAttribute('y2', this.vertex2.radius + this.vertex2.y * this.board.squareHeight);

        /* Set id, for this line, in order to retrieve later. */
        line.setAttribute(
            'id',
            'line-' + this.vertex1.x + '-' + this.vertex1.y + '-' + this.vertex2.x + '-' + this.vertex2.y
        );

        /* Attach the click event. */
        line.addEventListener('click', function (e) {

            that.board.game.completeTurn(that);
        });

        this.board.svg.appendChild(line);
    };

    /**
     * Mark, that this line is owned now.
     * Also update the color.
     */
    claimOwnership(owner) {

        if (!this.isOwned) {
            /* Get the element. */
            let lineDOM = document.getElementById(
                'line-' + this.vertex1.x + '-' + this.vertex1.y + '-' + this.vertex2.x + '-' + this.vertex2.y
            );

            /* Update it's color and the owner. */
            lineDOM.setAttribute('style', 'stroke: ' + owner.color + ' !important');
            this._owner = owner;

            /* Propagate the owner update further into child objects. */
            this.vertex1.claimOwnership(owner);
            this.vertex2.claimOwnership(owner);
        }
    }

    /* Getter functions for this class. */

    get isOwned() {
        return !!this._owner;
    }

    get owner() {
        return this._owner;
    }

    get board() {
        return this._renderer;
    }

    get getType() {
        return this._type;
    }

    get index() {
        return this._index;
    }

    get vertex1() {
        return this._vertex1;
    }

    get vertex2() {
        return this._vertex2;
    }
}