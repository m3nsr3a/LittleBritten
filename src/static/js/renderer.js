/**
 * Game board object that contains vertices, lines and squares and that handles
 * the completion of squares by players, as well as the drawing of all the
 * elements inside the game board.
 *
 */
class Board {

    /**
     * .
     *
     * game - A reference to the parent Game object.
     * boardId - HTML ID of the game board's SVG element.
     * width -  The number of squares in the horizontal direction.
     * height - The number of squares in the vertical direction.
     */
    constructor(game, boardId, width, height) {

        this._game = game;
        this._boardId = boardId;
        this._width = width;
        this._height = height;

        /* The element, we are going to use for doing all the drawing. */
        this._svg = document.getElementById(boardId);

        /*
         * Format the game board parameters.
         * Used to draw the correct number of dots and squares.
         */
        this._boxWidth = this.svg.width.baseVal.value;
        this._boxHeight = this.svg.height.baseVal.value;
        this._squareWidth = this.boxWidth / (width + 1);
        this._squareHeight = this.boxHeight / (height + 1);

        /* 2D array of vertices. */
        this._vertices = [];

        /* Lines connecting the vertices. */
        this._lines = [];

        /* Used only for drawing a player's color when a square is claimed. */
        this._squares = [];
    }



    /**
     * Initialize the vertices on the board.
     */
    initDots() {

        for (let y = 0; y <= this.height; y++) {
            this.vertices[y] = [];
            for (let x = 0; x <= this.width; x++) {
                this.vertices[y][x] = new Vertex(this, x, y);
            }
        }
    }

    /**
     * Initializes the line segments between the vertices.
     */
    initLines() {

        // current index into array of lines
        let index = 0;

        // Draw the horizontal lines
        for (let y = 0; y < this.vertices.length; y++) {
            for (let x = 0; x < this.vertices[y].length - 1; x++) {
                let line = new Line(this, 'horizontal', index, this.vertices[y][x], this.vertices[y][x + 1]);
                this.lines.push(line);
                index++;
            }
        }

        // Draw the vertical lines
        for (let y = 0; y < this.vertices.length - 1; y++) {
            for (let x = 0; x < this.vertices[y].length; x++) {
                let line = new Line(this, 'vertical', index, this.vertices[y][x], this.vertices[y + 1][x]);
                this.lines.push(line);
                index++;
            }
        }
    }

    /**
     * Initializes squares (used only for drawing a player's colors
     * when the square is claimed.)
     */
    initSquares() {

        // using this to get the default radius (not sure this is the best solution...)
        let dummyVertex = new Vertex(this, 0, 0);

        for (let y = 0; y < this.height; y++) {
            this.squares[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.squares[y][x] = new Square(this, x, y, dummyVertex.radius);
            }
        }
    };

    /**
     * Private: Takes as input a pair of [x, y] coordinates and returns the line
     * if it exists or null if it doesn't or if it's out of bounds.
     */
    getLine(coord1, coord2) {

        // out of bounds
        if (coord1[0] < 0 || coord1[1] < 0 || coord1[0] > this.width || coord1[1] > this.height) {
            return null;
        }

        else if (coord2[0] < 0 || coord2[1] < 0 || coord2[0] > this.width || coord2[1] > this.height) {
            return null;
        }

        let lineDOM = document.getElementById('line-' + coord1[0] + '-' + coord1[1] + '-' + coord2[0] + '-' + coord2[1]);
        return !lineDOM ? null : this.lines[parseInt(lineDOM.getAttribute('data-index'))];
    }

    /**
     * Private: Checks whether or not any boxes were completed. If so, they're
     * marked as completed by the specified player. Returns number of newly
     * completed squares.
     */
    checkBoxes(line) {

        let lineX1 = line.vertex1.x;
        let lineY1 = line.vertex1.y;
        let lineX2 = line.vertex2.x;
        let lineY2 = line.vertex2.y;

        let score = 0;

        // check squares on the top and bottom of the line
        if ('horizontal' === line.getType) {

            // top square
            let topTop = this.getLine([lineX1, lineY1 - 1], [lineX2, lineY2 - 1]);
            let topLeft = this.getLine([lineX1, lineY1 - 1], [lineX1, lineY1]);
            let topRight = this.getLine([lineX2, lineY2 - 1], [lineX2, lineY2]);

            if (topTop && topTop.isOwned &&
                topLeft && topLeft.isOwned &&
                topRight && topRight.isOwned) {
                this.squares[topLeft.vertex1.y][topLeft.vertex1.x].claimOwnership(line.owner);
                score++;
            }

            // bottom square
            let bottomBottom = this.getLine([lineX1, lineY1 + 1], [lineX2, lineY2 + 1]);
            let bottomLeft = this.getLine([lineX1, lineY1], [lineX1, lineY1 + 1]);
            let bottomRight = this.getLine([lineX2, lineY2], [lineX2, lineY2 + 1]);

            if (bottomBottom && bottomBottom.isOwned &&
                bottomLeft && bottomLeft.isOwned &&
                bottomRight && bottomRight.isOwned) {
                this.squares[line.vertex1.y][line.vertex1.x].claimOwnership(line.owner);
                score++;
            }
        }

        // check squares to the left and right of the line
        else {

            // left square
            let leftLeft = this.getLine([lineX1 - 1, lineY1], [lineX2 - 1, lineY2]);
            let leftTop = this.getLine([lineX1 - 1, lineY1], [lineX1, lineY1]);
            let leftBottom = this.getLine([lineX2 - 1, lineY2], [lineX2, lineY2]);

            if (leftLeft && leftLeft.isOwned &&
                leftTop && leftTop.isOwned &&
                leftBottom && leftBottom.isOwned) {
                this.squares[leftTop.vertex1.y][leftTop.vertex1.x].claimOwnership(line.owner);
                score++;
            }

            // right square
            let rightRight = this.getLine([lineX1 + 1, lineY1], [lineX2 + 1, lineY2]);
            let rightTop = this.getLine([lineX1, lineY1], [lineX1 + 1, lineY1]);
            let rightBottom = this.getLine([lineX2, lineY2], [lineX2 + 1, lineY2]);

            if (rightRight && rightRight.isOwned &&
                rightTop && rightTop.isOwned &&
                rightBottom && rightBottom.isOwned) {
                this.squares[line.vertex1.y][line.vertex1.x].claimOwnership(line.owner);
                score++;
            }
        }

        return score;
    }

    /**
     * Public: Claims a line in the name of the specified player and checks
     * for box completion by said player.
     */
    claimLine(player, line) {

        line.claimOwnership(player);
        return this.checkBoxes(line);
    }

    /**
     * Initializes the gameboard's lines and vertices.
     */
    init() {

        this.initDots();
        this.initLines();
        this.initSquares();
    }

    /**
     * Public: Draws the game board.
     */
    draw() {

        // draw the squares (invisible until a player claims them)
        for (let i = 0; i < this.squares.length; i++) {
            for (let j = 0; j < this.squares[i].length; j++) {
                this.squares[i][j].draw();
            }
        }

        // draw the lines
        for (let i = 0; i < this.lines.length; i++) {
            this.lines[i].draw();
        }

        // draw the vertices (should be on top of the lines)
        for (let i = 0; i < this.vertices.length; i++) {
            for (let j = 0; j < this.vertices[i].length; j++) {
                this.vertices[i][j].draw();
            }
        }
    }

    /* Getter functions for this class. */

    get game() {
        return this._game;
    }

    get squareHeight() {
        return this._squareHeight;
    }

    get squareWidth() {
        return this._squareWidth;
    }

    get boxWidth() {
        return this._boxWidth;
    }

    get boxHeight() {
        return this._boxHeight;
    }

    get svg() {
        return this._svg;
    }

    get vertices() {
        return this._vertices;
    }

    get lines() {
        return this._lines;
    }

    get squares() {
        return this._squares;
    }

    get boardId() {
        return this._boardId;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }
}
