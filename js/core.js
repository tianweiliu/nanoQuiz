// Data variables 
var question = 1;
var questionCount = 1;
var instruction;
	
// Configuration variables
var URL = "";
var shuffleQuestion = false;
var shuffleAnswer = false;

// Envirnoment variables
var switching = false;

function showMenu() {
	$(".progressCircle").animate({marginTop: (-$(".progressCircle").height() - parseInt($(".progressCircle").css("padding").replace("px", ""))) + "px"}, "fast").fadeOut("fast");
	$(".footer .forward").unbind("tap").removeClass("nextPage").addClass("start").html("Start").show();
	$(".prevPage").hide();
	$(".submit").hide();
	$("#shuffleQuestionflip").on("change", function(event, ui) {
		shuffleQuestion = ($("#shuffleQuestionflip").val() == "on") ? true : false;
	}).val(shuffleQuestion ? "on": "off");
	$("#shuffleQuestionflip").on("change", function(event, ui) {
		shuffleAnswer = ($("#shuffleAnswerflip").val() == "on") ? true : false;
	}).val(shuffleQuestion ? "on": "off");
	$(".start").on("tap", function() {
		if (contentInit())
			quizInit();
	});
}

function hideMenu() {
	$(".progressCircle").fadeIn("fast").animate({marginTop: "0px"}, "fast");
	$(".start").unbind("tap").removeClass("start").addClass("nextPage").html("Next");
}

function loadJSON(url) {
	console.log("Loading JSON...");
	URL = url;
	//$(".ui-loader").show();
	$.ajax({
		dataType: "json",
		url: url,
		success: function(data) {
			console.log("success");
			instruction = data;
			//$(".ui-loader").hide();
			showMenu();
		},
	});
}

function contentInit() {
	if (instruction.question) {
		/* Remove old questions if any */
		$(".questions").remove();
		
		/* Question array process */
		var questionArray = instruction.question;
		if (shuffleQuestion)
			shuffle(questionArray);
		
		/* Parse question arrary */
		loadQuestion(questionArray);
		
		$(".questions").each(function(index, element) {
			$(this).attr("id", "q" + (index + 1).toString());
		});
		
		return true
	}
	return false
}

function loadQuestion(data) {
	$.each(data, function(index, questionData) {
		
		console.log("Loading question " + (index + 1) + "/" + data.length + " ...");
		/* Create new questions HTML structure */
		// jQuery Mobile page
		var $questions = $("<div></div>").attr("data-role", "page").addClass("questions");
		$questions.insertBefore(".header");
		loadContent(questionData, $questions);
	});
}

function loadContent(data, $questions) {
	// Content wrapper
	var $wrapper = $("<div></div>").addClass("content");
	// Insert wrapper into page
	$questions.append($wrapper);
	if (data.vignette && data.vignette.length > 0) {
		/* Create new question HTML structure */
		var $question = $("<div></div>").addClass("question");
		$wrapper.append($question);
		var $questionBullet = $("<div></div>").addClass("bullet");
		$question.append($questionBullet);
		
		/* Parse vignette array */
		loadVignette(data.vignette, $question);
	}
	if (data.answer && data.answer.length > 0) {
		/* Create new answers HTML structure */
		var $answers = $("<div></div>").addClass("answers");
		$wrapper.append($answers);
		if (data.sprite) {
			var $sprite = $("<img />").addClass("answerImage").attr("alt", "answer").attr("src", data.sprite.content);
			$answers.append($sprite);
		}
		var $answersUL = $("<ul></ul>");
		$answers.append($answersUL);
		
		/* Answer array process */
		var answerArray = data.answer
		if (shuffleAnswer)
			shuffle(answerArray);
		
		/* Parse answer array */
		loadAnswer(data.answer, $answersUL);
	}
}

function loadVignette(data, $question) {
	$.each(data, function(index, nodeData) {
		if (nodeData.type) {
			console.log("Loading vignette " + (index + 1) + "/" + data.length + "(" + nodeData.type + ") ...");
			switch (nodeData.type) {
				case "text":
					//Text content
					var $vignette = $("<p></p>");
					if (nodeData.content)
						$vignette.html(nodeData.content);
					$question.append($vignette);
				break;
				case "image":
					// Image content
					var $vignette = $("<div></div>").addClass("graph");
					var $image = $("<img />").attr("alt", "graph");
					if (nodeData.content)
						$image.attr("src", nodeData.content);
					$vignette.append($image);
					$question.append($vignette);
				break;
				default: break;
			}
		}
	});
}

function loadAnswer(data, $answers) {
	var bullets = "abcdefghijklmnopqrstuvwxyz";
	$.each(data, function(index, nodeData) {
		if (nodeData.type) {
			console.log("Loading answer " + (index + 1) + "/" + data.length + "(" + nodeData.type + ") ...");
			
			/* Create new answer HTML strcuture */
			var $answer = $("<li></li>").addClass("answer");
			$answers.append($answer);
			var $answerList = $("<div></div>").addClass("answerList");
			if (nodeData.correct)
				$answerList.addClass("correct");
			$answer.append($answerList);
			var $mark = $("<div></div>").addClass("mark");
			$answerList.append($mark);
			var $answerContent = $("<div></div>").addClass("answerContent");
			$answerList.append($answerContent);
			var $answerBullet = $("<div></div>").addClass("bullet").html(bullets.substr(index, 1) + ")");
			$answerContent.append($answerBullet);
			switch (nodeData.type) {
				case "text":
					//Text content
					var $thisAnswer = $("<p></p>");
					if (nodeData.content)
						$thisAnswer.html(nodeData.content);
					$answerContent.append($thisAnswer);
				break;
				case "image":
					// Image content
					
				case "sprite":
					// Image sprite
					if (nodeData.content) {
						var $spriteAnswer = $("<div></div>").addClass("answerSprite").attr("id", nodeData.content);
						$answerContent.append($spriteAnswer);
					}
				break;
				default: break;
			}
		}
	});
}

function shuffle(sourceArray) {
	for (var n = 0; n < sourceArray.length - 1; n++) {
		var k = n + Math.floor(Math.random() * (sourceArray.length - n));

		var temp = sourceArray[k];
		sourceArray[k] = sourceArray[n];
		sourceArray[n] = temp;
	}
}

function quizInit() {
	
	hideMenu();
	
	/* Detect questions */
	questionCount = $(".questions").length;
	
	/* Reset data variables */
	question = 1;
	instruction = null;
	
	$(".questions").each(function(index, element) {
		$(this).find(".question").children(".bullet").html((index + 1).toString() + ".");
	});
	
	/* Load all answer sprites */
	$(".answerImage").each(function(index, element) {
		var sprite = this;
		$("<img />").load(function(e) {
			var tmpImg = this;
			$(sprite).parent("div").find(".answerSprite").each(function(index, element) {
				if ($(this).attr("id")) {
					var i = $(this).attr("id").substr(0, 1);
					var c = $(this).attr("id").substr(3);
					$(this).css({
						"background-image": "url(" + $(tmpImg).attr("src") + ")",
						"background-position": "0 " + ((1 - i) / c * tmpImg.height) + "px",
						"width": tmpImg.width + "px",
						"height": tmpImg.height / c + "px"
					});
				}
			});
		}).attr("src", $(this).attr("src"));
	});
	
	/* Initiate progress knob */
	$(".knob").knob({
		"min": 0,
		"max": questionCount,
		"fgColor": "#00e4ff"
	});
	$(".knob").on("change", function() {
		$(".progressInfo").html(question.toString() + "/" + questionCount.toString());
	});
	
	$(':mobile-pagecontainer').on("pagecontainershow", function(event, ui) {
		onQuestionSwitch(event, ui);
	});
	
	$(".nextPage").on("tap", function(e) {
		e.preventDefault();
		nextQuestion();
	});
	
	$(".prevPage").on("tap", function(e) {
		e.preventDefault();
		prevQuestion();
	});
	
	$("body").on("swipeleft", function() {
		nextQuestion();
	});
	
	$("body").on("swiperight", function() {
		prevQuestion();
	});
	
	console.log("Initialization success\nSwitching to question " + question.toString() + " ...");
	$(':mobile-pagecontainer').pagecontainer( "change", "#q" + question.toString(), { transition: "slideup"} );
}

function nextQuestion() {
	if (question < questionCount) {
		if (switching)
			return;
		else
			switching = true;
		console.log("Switching to question " + (question + 1).toString() + " ...");
		$(':mobile-pagecontainer').pagecontainer( "change", "#q" + (question + 1).toString(), { transition: "slide"} );
	}
	else
		question = questionCount;
}

function prevQuestion() {
	if (question > 1)  {
		if (switching)
			return;
		else
			switching = true;
		console.log("Switching to question " + (question - 1).toString() + " ...");
		$(':mobile-pagecontainer').pagecontainer( "change", "#q" + (question - 1).toString(), { transition: "slide", reverse: "true"} );
	}
	else
		question = 1;
}

function onResize() {
	$(".progressCircle").css("margin-left", $(window).width() * 0.5 - $(".progressCircle").width() * 0.5 + "px");
}

function onQuestionSwitch(event, ui) {
	if ($(".ui-page-active")) {
		var targetQuestion = $(".ui-page-active").attr("id");
		if (targetQuestion == "settings") {
			loadJSON(URL);
		}
		else if(targetQuestion) {
			targetQuestion = parseInt(targetQuestion.replace("q", ""));
			if (targetQuestion && targetQuestion <= questionCount) {
				question = targetQuestion;
				switchQuestion();
			}
		}
		switching = false;
	}
}

function switchQuestion() {
	hideMenu();
	$(".knob").val(question).trigger("change");
	if (question >= questionCount)
		$(".nextPage").html("Result");
	else if($("#q" + question).find(".locked").length > 0)
		$(".nextPage").html("Next");
	else
		$(".nextPage").html("Skip");
	if (question <= 1) 
		$(".prevPage").hide();
	else
		$(".prevPage").show();
	if ($("#q" + question).find(".selected").length > 0 && $("#q" + question).find(".locked").length == 0) 
			$(".submit").show();
		else
			$(".submit").hide();
	eventInit();
	/*
	$(".selected").removeClass("selected");
	$(".answer").removeClass("locked");
	$(".nextPage").html("Skip");
	$(".answer .answerContent").removeAttr("style");
	$(".mark").removeClass("correct");
	$(".mark").removeClass("wrong");
	$(".mark").hide();
	$(".answerContent").removeAttr("style");
	*/
}

function eventInit() {
	$(".answer").unbind("tap");
	$(".submit").unbind("tap");
	
	$("#q" + question).find(".answer").on("tap", function(e) {
		e.preventDefault();
		chooseAnswer($(this));
	});
	
	/* When submit is clicked */
	$(".submit").on("tap", function(e) {
		e.preventDefault();
		submitAnswer();
	});
}

function chooseAnswer($answer) {
	/* When answer is already submitted */
	if ($answer.hasClass("locked")) 
		return;
	
	if ($answer.children(".answerList").hasClass("selected"))
		/* Double tap on answer */
		quickSubmit($answer);
	else {
		/* Select this answer */
		$("#q" + question).find(".selected").removeClass("selected");
		$answer.children(".answerList").addClass("selected");
		
		/* Show / Hide submit button */
		if ($("#q" + question).find(".selected").length > 0) 
			$(".submit").show();
		else
			$(".submit").hide();
	}
}

function quickSubmit($answer) {
	/* Submit selection */
	submitAnswer();
	
	/* Switch to next question */
	if ($answer.children(".answerList").hasClass("correct"))
		nextQuestion();
}

function submitAnswer() {
	$("#q" + question).find(".answer").addClass("locked");
	$(".submit").hide();
	if (question >= questionCount) 
		$(".nextPage").html("Result");
	else
		$(".nextPage").html("Next");
	$("#q" + question).find(".answer .answerContent").css("color", "#c7c7c7");
	
	/* Show correct answer */
	$("#q" + question).find(".correct .answerContent").animate({
		marginLeft: "74px"
	}, "fast").css({
		"color": "#000",
		"border-left-width": "1px"
	});
	$("#q" + question).find(".correct .mark").addClass("correct").fadeIn("fast");
	
	/* Wrong answer selected */
	if (!$("#q" + question).find(".selected").hasClass("correct")) {
		$("#q" + question).find(".selected .answerContent").animate({
			marginLeft: "74px"
		}, "fast").css({
			"color": "#000",
			"border-left-width": "1px"
		});
		$("#q" + question).find(".selected .mark").addClass("wrong").fadeIn("fast");
	}
}