$(document).ready(function(){
    var field = $("#field");
    var start = $("#start");
    var stop = $("#stop");
    var repeat = $("#repeat");
    var rowCount = 10;
    var colCount = 10;
    var QValue = {};
    var alpha = 0.5;
    var gamma = 1;
    var robotPosition = {r: 0, c:0};
    var isPlaying = false;
    var isRobotPlaying = true;
    var actions = ['up', 'down', 'left', 'right'];
    var learningTime = $("#learning-time");
    var learningTimeSecond = 0;

    setInterval(function(){
        if (isPlaying) {
            learningTimeSecond++;
            var totalSec = learningTimeSecond;
            var hours = parseInt( totalSec / 3600 ) % 24;
            var minutes = parseInt( totalSec / 60 ) % 60;
            var seconds = totalSec % 60;

            var result = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds : seconds);
            learningTime.html(result);
        }
    }, 1000);

    start.click(function(){
        startGame();
    });

    stop.click(function(){
        stopGame();
    });

    function getReward(r, c) {
        var cell = $(".field-cell[num="+r+"-"+c+"]");
        if (getColor(cell) == 'red')
            return -1;
        if (getColor(cell) == 'green')
            return 1;
        return 0;
    }

    function getQValue(r, c, a) { //row, col, action (up, down, left, right)
        var key = r + "-"  + c + a;
        if (QValue.hasOwnProperty(key)) {
            return QValue[key];
        }
        return 0;
    }

    function setQValue(r, c, a, val) {
        var key = r + "-" + c + a;
        QValue[key] = val;
    }

    function initMap(){
        isPlaying = false;
        var html = "";
        QValue = {};
        for (var i=0;i<rowCount;i++) {
            html += "<tr>";
            for (var j=0;j<rowCount;j++) {
                html += "<td class='field-cell' num='"+i+"-"+j+"'></td>";
            }
            html += "</tr>";
        }
        field.html(html);
        $(".field-cell").click(function(){
            flipRedBlock($(this).attr("num"));
        });
        $(".field-cell[num="+(rowCount-1)+"-"+(colCount-1)+"]").css('background-color', 'green');
    }

    function flipRedBlock(fieldCellNum) {
        if (!isPlaying && fieldCellNum != (rowCount-1)+"-"+(colCount-1)) {
            var a = $(".field-cell[num=" + fieldCellNum + "]");
            if (getColor(a) == 'white')
                a.css('background-color', 'red');
            else a.css('background-color', 'white');
        }
    }

    function isNotWhite(fieldCellNum) {
        return getColor($(".field-cell[num="+fieldCellNum+"]")) != 'white';
    }

    function startGame() {
        removeRobot();
        do {
            robotPosition.r = parseInt(Math.round(Math.random()*(rowCount-1)));
            robotPosition.c = parseInt(Math.round(Math.random()*(colCount-1)));
        } while(isNotWhite(robotPosition.r + "-" + robotPosition.c));
        isPlaying = true;
        showRobot();
    }

    function stopGame() {
        initMap();
    }

    function getMaxQValue(r, c) {
        var highest = -100000;
        for (var i=0;i<4;i++) {
            highest = Math.max(highest, getQValue(r, c, actions[i]));
        }
        return highest;
    }

    setInterval(function(){
        if (isRobotPlaying && isPlaying) {
            removeRobot();
            var actIndex;
            var useExplore = false;
            if (Math.random() <= 0.1) { //explore the unexplored!
                actIndex = Math.floor(Math.random()*100)%4;
                if (getQValue(robotPosition.r, robotPosition.c, actions[actIndex]) == 0) {
                    useExplore = true;
                }
            }
            if (useExplore == false) {
                //exploit
                //get highest Q for each action in current state
                var highest = -100000;
                var highestIndex = [];
                for (var i=0;i<4;i++) {
                    var cur = getQValue(robotPosition.r, robotPosition.c, actions[i]);
                    if (cur > highest) {
                        highest = cur;
                        highestIndex = [];
                        highestIndex.push(i);
                    } else if (cur == highest) {
                        highestIndex.push(i);
                    }
                }
                actIndex = highestIndex[Math.floor(Math.random()*100)%highestIndex.length];
            }

            //update Qvalue for current state with action [act]
            var nextRobotPosition = {};
            switch(actions[actIndex]) {
                case "up":
                    nextRobotPosition.c = robotPosition.c;
                    nextRobotPosition.r = robotPosition.r-1;
                    break;
                case "down":
                    nextRobotPosition.c = robotPosition.c;
                    nextRobotPosition.r = robotPosition.r+1;
                    break;
                case "left":
                    nextRobotPosition.r = robotPosition.r;
                    nextRobotPosition.c = robotPosition.c-1;
                    break;
                case "right":
                    nextRobotPosition.r = robotPosition.r;
                    nextRobotPosition.c = robotPosition.c+1;
                    break;
            }

            //check outOfBound
            var outOfBound = false;
            if (nextRobotPosition.c < 0 || nextRobotPosition.c >= colCount ||
                nextRobotPosition.r < 0 || nextRobotPosition.r >= rowCount)
                outOfBound = true;

            nextRobotPosition.c = Math.min(nextRobotPosition.c, colCount-1);
            nextRobotPosition.c = Math.max(nextRobotPosition.c, 0);
            nextRobotPosition.r = Math.min(nextRobotPosition.r, rowCount-1);
            nextRobotPosition.r = Math.max(nextRobotPosition.r, 0);

            var maxQValueNextState = getMaxQValue(nextRobotPosition.r, nextRobotPosition.c);
            var oldQValue = getQValue(robotPosition.r, robotPosition.c, actions[actIndex]);
            var rewardAfterAction;
            if (outOfBound) rewardAfterAction = -0.1;
            else rewardAfterAction = getReward(nextRobotPosition.r, nextRobotPosition.c);
            var newQValue = oldQValue + alpha*(rewardAfterAction + gamma*maxQValueNextState - oldQValue);
            setQValue(robotPosition.r, robotPosition.c, actions[actIndex], newQValue);
            robotPosition = nextRobotPosition;
            showRobot();
        }
    }, 50);

    $("body").keydown(function(event){
        if (!isRobotPlaying && isPlaying && event.keyCode >= 37 && event.keyCode <= 40) {
            removeRobot();
            switch(event.keyCode) {
                case 37: //left
                    robotPosition.c--;
                    robotPosition.c = Math.max(robotPosition.c, 0);
                    break;
                case 38: //up
                    robotPosition.r--;
                    robotPosition.r = Math.max(robotPosition.r, 0);
                    break;
                case 39: //right
                    robotPosition.c++;
                    robotPosition.c = Math.min(robotPosition.c, colCount-1);
                    break;
                case 40: //down
                    robotPosition.r++;
                    robotPosition.r = Math.min(robotPosition.r, rowCount-1);
                    break;
            }
            showRobot();
        }
    });

    function removeRobot() {
        $(".field-cell[num="+robotPosition.r + "-" + robotPosition.c+"]").html("");
    }

    function getColor(cell) {
        if (cell.css('background-color')=='rgb(255, 255, 255)')
            return 'white';
        if (cell.css('background-color')=='rgb(255, 0, 0)')
            return 'red';
        return 'green';
    }

    function showRobot() {
        var cell = $(".field-cell[num="+robotPosition.r + "-" + robotPosition.c+"]");
        cell.html("bot");
        if (getColor(cell) == 'green' || getColor(cell) == 'red')
            isPlaying = false;
        if (isPlaying == false && $("#repeat").is(":checked")) {
            startGame();
        }
    }

    window.printQValue = function(){
        console.log(QValue);
    };

    initMap();
});