$(document).ready(function(){
    var board;
    var currentTurn = 0;
    var turnText = $("#turn");
    var scoreText = $("#score");
    var score = {};
    var totalGame = 0;
    var blackComputer = false;
    var whiteComputer = false;
    var blackComputerInput = $("#black-computer");
    var whiteComputerInput = $("#white-computer");
    var tileReward = [
        [ 40, -10, 3, 3, 3, 3, -10,  40],
        [-10, -10, 0, 0, 0, 0, -10, -10],
        [  3,   0, 0, 0, 0, 0,   0,   3],
        [  3,   0, 0, 0, 0, 0,   0,   3],
        [  3,   0, 0, 0, 0, 0,   0,   3],
        [  3,   0, 0, 0, 0, 0,   0,   3],
        [-10, -10, 0, 0, 0, 0, -10, -10],
        [ 40, -10, 3, 3, 3, 3, -10,  40]
    ];
    window.tileReward = tileReward;
    var gamma = 0.7;
    window.epsilon = 0.05;
    var computerDelay = 1;
    var net = new brain.NeuralNetwork({
        hiddenLayers: [133, 133, 133],
        learningRate: 0.1
    });

    window.debugState = buildBoardStateAndAction(
        [
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, 0, 1, null, null, null],
            [null, null, null, 1, 0, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null]
        ], 0, 5, 3
    );

    //init structure
    window.initialBrainState = buildBoardStateAndAction(null);
    net.train([{input: buildBoardStateAndAction(null), output: [0]}], {initialization: true, iterations: 0});

    $("#delay1").click(function(){changeComputerDelay(1)});
    $("#delay10").click(function(){changeComputerDelay(10)});
    $("#delay100").click(function(){changeComputerDelay(100)});
    $("#delay1000").click(function(){changeComputerDelay(1000)});
    $("#delay10000").click(function(){changeComputerDelay(10000)});

    $("#load-brain").click(function(){
        whiteComputerInput.attr('checked', false);
        blackComputerInput.attr('checked', false);
        blackComputer = false;
        whiteComputer = false;
        window.epsilon = 0.001;

        $.ajax({
            url: "pre-trained-brain.js", // +-1100 x training vs self
            dataType: "script",
            success: function(){
                console.log(preTrainedBrain);
                net.fromJSON(preTrainedBrain);
                $("#load-brain").hide();
                init();
            }
        });
    });

    function init() {
        $("#game-number").html("Game #"+(++totalGame));
        window.net = net;
        score = {0:0, 1:0};
        clearBoard();
        changeBoardState(3, 3, 1);
        changeBoardState(3, 4, 0);
        changeBoardState(4, 3, 0);
        changeBoardState(4, 4, 1);
        changeTurn(0);
        renderAvailableMoves();
    }

    $("#start").click(function(){
        init();
    });

    function changeTurn(turn) {
        currentTurn = turn;
        turnText.css('color', turn?'white':'black');
        turnText.html(turn?"White's turn":"Black's turn");
        scoreText.html("<span style='color:black;'>"+score[0]+"</span> <span style='color:white'>"+score[1]+"</span>");
    }

    $("#board").find("tr td").click(function(){
        //for human player
        var id = $(this).find("div").attr("id");
        var row = parseInt(id[0]);
        var col = parseInt(id[1]);

        if (currentTurn==0 && blackComputer)
            return;
        if (currentTurn==1 && whiteComputer)
            return;

        if (executeTurn(row, col, currentTurn)) {
            //execution succeed, end of turn
            changeTurn(1-currentTurn);
            renderAvailableMoves();
        }
    });

    function getUpdatedBoard(row, col) {
        var updatedBoard = $.extend(true, [], board);

        //up
        tryToMarkBoard(updatedBoard, row, col, -1, 0);
        //down
        tryToMarkBoard(updatedBoard, row, col, 1, 0);
        //left
        tryToMarkBoard(updatedBoard, row, col, 0, -1);
        //right
        tryToMarkBoard(updatedBoard, row, col, 0, 1);
        //up right
        tryToMarkBoard(updatedBoard, row, col, -1, 1);
        //up left
        tryToMarkBoard(updatedBoard, row, col, -1, -1);
        //down right
        tryToMarkBoard(updatedBoard, row, col, 1, 1);
        //down left
        tryToMarkBoard(updatedBoard, row, col, 1, -1);

        updatedBoard[row][col] = currentTurn;

        return updatedBoard;
    }

    //return false if turn fails
    function executeTurn(row, col) {
        var availableMoves = getAvailableMovesBasedOnBoardAndTurn(board, currentTurn);

        if (availableMoves.length == 0) {
            return;
        }

        var available = false;
        for (var i=0;i<availableMoves.length;i++) {
            if (availableMoves[i].row == row && availableMoves[i].col == col) {
                available = true;
                break;
            }
        }
        if (!available) {
            return false;
        }

        var newBoard = getUpdatedBoard(row, col);
 //       console.log($.extend(true, [], board));
 //       console.log($.extend(true, [], newBoard));

        for (var i=0;i<8;i++) {
            for (var j=0;j<8;j++) {
                if (newBoard[i][j] != board[i][j])
                    changeBoardState(i, j, newBoard[i][j]);
            }
        }

        return true;
    }

    function tryToMarkBoard(boardToMark, startI, startJ, moveI, moveJ) {
        //right
        var ii = startI+moveI;
        var jj = startJ+moveJ;
        while(ii>=0 && ii<8 && jj>=0 && jj<8 && board[ii][jj]!=null && board[ii][jj]!=currentTurn) {
            ii+=moveI;
            jj+=moveJ;
        }
        if ((Math.abs(ii-startI)>1 || Math.abs(jj-startJ)>1) && ii>=0 && ii<8 && jj>=0 && jj<8 && board[ii][jj]==currentTurn) {
            while(ii!=startI || jj!=startJ) {
                boardToMark[ii][jj] = currentTurn;
                jj-=moveJ;
                ii-=moveI;
            }
        }
    }

    function isMoveAvailable(useBoard, turn, startI, startJ, moveI, moveJ) {
        var ii = startI+moveI;
        var jj = startJ+moveJ;
        while(ii>=0 && ii<8 && jj>=0 && jj<8 && useBoard[ii][jj]!=null && useBoard[ii][jj]!=turn) {
            ii+=moveI;
            jj+=moveJ;
        }
        if ((Math.abs(ii-startI)>1 || Math.abs(jj-startJ)>1) && ii>=0 && ii<8 && jj>=0 && jj<8 && useBoard[ii][jj]==turn)
            return true;
        return false;
    }

    function getAvailableMovesBasedOnBoardAndTurn(useBoard, turn) {
        var availableMovesInRowColumn = [];
        for (var i=0;i<8;i++) {
            for (var j=0;j<8;j++) {
                if (useBoard[i][j] == null) {
                    //up
                    if (isMoveAvailable(useBoard, turn, i, j, -1, 0)) {availableMovesInRowColumn.push({row: i, col:j}); continue;}
                    //down
                    if (isMoveAvailable(useBoard, turn, i, j, 1, 0)) {availableMovesInRowColumn.push({row: i, col:j}); continue;}
                    //left
                    if (isMoveAvailable(useBoard, turn, i, j, 0, -1)) {availableMovesInRowColumn.push({row: i, col:j}); continue;}
                    //right
                    if (isMoveAvailable(useBoard, turn, i, j, 0, 1)) {availableMovesInRowColumn.push({row: i, col:j}); continue;}
                    //up right
                    if (isMoveAvailable(useBoard, turn, i, j, -1, 1)) {availableMovesInRowColumn.push({row: i, col:j}); continue;}
                    //up left
                    if (isMoveAvailable(useBoard, turn, i, j, -1, -1)) {availableMovesInRowColumn.push({row: i, col:j}); continue;}
                    //down right
                    if (isMoveAvailable(useBoard, turn, i, j, 1, 1)) {availableMovesInRowColumn.push({row: i, col:j}); continue;}
                    //down left
                    if (isMoveAvailable(useBoard, turn, i, j, 1, -1)) {availableMovesInRowColumn.push({row: i, col:j});}
                }
            }
        }

        return availableMovesInRowColumn;
    }

    //last function call of each turn
    function renderAvailableMoves() {
        var availableMoves = getAvailableMovesBasedOnBoardAndTurn(board, currentTurn);
        if (availableMoves.length == 0) {
            changeTurn(1-currentTurn);
            availableMoves = getAvailableMovesBasedOnBoardAndTurn(board, currentTurn);
            if (availableMoves.length == 0) {
                for (var i=0;i<8;i++) {
                    for (var j=0;j<8;j++) {
                        $("#"+i+j).removeClass('indicator');
                    }
                }
                turnText.html("END");
                if ($("#auto-restart").is(":checked")) {
                    setTimeout(function(){
                        init();
                        console.log(net.run(window.debugState));
                    }, 1);
                }
                return;
            }
        }
        for (var i=0;i<8;i++) {
            for (var j=0;j<8;j++) {
                $("#"+i+j).removeClass('indicator');
            }
        }
        for (var i=0;i<availableMoves.length;i++) {
            var row = availableMoves[i].row;
            var col = availableMoves[i].col;
            $("#"+row+col).addClass('indicator');
        }

        //AI
        if (availableMoves.length > 0) {
            if (blackComputerInput.is(":checked")) blackComputer = true;
            else blackComputer = false;
            if (whiteComputerInput.is(":checked")) whiteComputer = true;
            else whiteComputer = false;

            if (currentTurn==0 && blackComputer) {
                setTimeout(function(){
                    runAIOnCurrentTurn(availableMoves);
                }, computerDelay);
            } else if (currentTurn==1 && whiteComputer) {
                setTimeout(function(){
                    runAIOnCurrentTurn(availableMoves);
                }, computerDelay);
            }
        }
    }

    function changeComputerDelay(val) {
        $("#delay").html(val + "ms");
        computerDelay = val;
    }

    function changeBoardState(row, column, color) { //color = 0/1
        if (board[row][column]!=null) score[board[row][column]]--;
        score[color]++;
        board[row][column] = color;
        $("#"+row+column).css('background-color', color?'white':'black');
    }

    function clearBoard() {
        board = [];
        for (var i=0;i<8;i++) {
            board[i] = [];
            for (var j=0;j<8;j++) {
                board[i][j] = null;
                $("#"+i+j).css('background-color', '');
            }
        }
    }

    init();

    function buildBoardStateAndAction(boardToBuild, turn, moveR, moveC) {
        var state = [];
        if (boardToBuild==null) { //for initialization
            for (var i=0;i<192;i++) state.push(0);
            return state;
        }
        for (var i=0;i<8;i++) {
            for (var j=0;j<8;j++) {
                //punya sendiri
                if (boardToBuild[i][j]==turn)
                    state.push(1);
                else state.push(0);
                //punya musuh
                if (boardToBuild[i][j]==1-turn)
                    state.push(1);
                else state.push(0);
            }
        }

        for (var i=0;i<8;i++) {
            for (var j=0;j<8;j++) {
                if (i==moveR && j==moveC)
                    state.push(1);
                else state.push(0);
            }
        }
        return state;
    }

    function checkWinner(boardToCheck) { //null: no winner, 0: 0 win, 1: 1 win, 2: draw
        var winner = null;
        var availableMoves = getAvailableMovesBasedOnBoardAndTurn(boardToCheck, 0);
        if (availableMoves.length == 0) {
            availableMoves = getAvailableMovesBasedOnBoardAndTurn(boardToCheck, 1);
            if (availableMoves.length == 0) {
                var tempScore = {0:0, 1:0};
                for (var i=0;i<8;i++) {
                    for (var j=0;j<8;j++) {
                        if (boardToCheck[i][j]!=null) {
                            tempScore[boardToCheck[i][j]]++;
                        }
                    }
                }
                if (tempScore[0] > tempScore[1])
                    winner = 0;
                else if (tempScore[0] < tempScore[1])
                    winner = 1;
                else winner = 2;
            }
        }
        return winner;
    }

    function runAIOnCurrentTurn(availableMoves) {
        var highestIndex = 0;
        var highestQValue = -100;
        if (Math.random() <= window.epsilon) { //explore
            highestIndex = Math.round(Math.random()*100)%availableMoves.length;
        } else {
            for (var i = 0; i < availableMoves.length; i++) {
                var state = buildBoardStateAndAction(board, currentTurn,
                                                     availableMoves[i].row,
                                                     availableMoves[i].col);
                var qValue = getQValue(state);
                if (highestQValue < qValue) {
                    highestQValue = qValue;
                    highestIndex = i;
                }
            }
            if (highestQValue == -1) throw new Error("Wrong highest q value");
        }
        var row = availableMoves[highestIndex].row; var col = availableMoves[highestIndex].col;
        var newBoard = getUpdatedBoard(row, col);

        //check if new board is terminating
        var winner = checkWinner(newBoard);
        if (winner==null) {
            var nextMaxQValue = -1000;
            var isNextTurnSame = false; //true if nextTurn player == currentTurn
            var nextAvailableMoves = getAvailableMovesBasedOnBoardAndTurn(newBoard, 1-currentTurn);
            if (nextAvailableMoves.length == 0) {
                nextAvailableMoves = getAvailableMovesBasedOnBoardAndTurn(newBoard, currentTurn);
                isNextTurnSame = true;
            }
            for (var i=0;i<nextAvailableMoves.length;i++) {
                nextMaxQValue = Math.max(nextMaxQValue, getQValue(buildBoardStateAndAction(newBoard, (isNextTurnSame)?(currentTurn):(1-currentTurn), nextAvailableMoves[i].row, nextAvailableMoves[i].col)));
            }
            var scoreIncrement = 0;
            for (var i=0;i<8;i++) {
                for (var j=0;j<8;j++) {
                    if (board[i][j]!=currentTurn && newBoard[i][j]==currentTurn)
                        scoreIncrement++;
                }
            }

            if (nextMaxQValue == -1000) throw new Error("IMPOSSIBLE!");
            
            if (scoreIncrement < 2) throw new Error("Score increment is less than 2");
            //-nextMaxQValue because of game theory
            trainNN(buildBoardStateAndAction(board, currentTurn, row, col), Math.max(Math.min(64, scoreIncrement + tileReward[row][col] + ((isNextTurnSame)?(1):(-1))*gamma*nextMaxQValue), -64));
        } else {
            var reward = null;
            if (winner==2) //draw
                reward = 0;
            else if (winner==currentTurn)
                reward = 64;
            else reward = -64;
            trainNN(buildBoardStateAndAction(board, currentTurn, row, col), reward);
        }

        if (executeTurn(row, col, currentTurn)) {
            //execution succeed, end of turn
            changeTurn(1-currentTurn);
            renderAvailableMoves();
        }
    }

    function trainNN(state, val) {
        net.train([{input: state, output: [normalize(val)]}]);
    }

    function getQValue(state) {
        return denormalize(net.run(state)[0]);
    }

    var lowestPossibleValue = -64.0;
    var highestPossibleValue = 64.0;
    function normalize(val) {
        return (val-lowestPossibleValue)/(highestPossibleValue-lowestPossibleValue);
    }

    function denormalize(val) {
        return val * (highestPossibleValue - lowestPossibleValue) + lowestPossibleValue;
    }
});