// Data variables 
var question = 1;
var questionCount = 1;
var instruction;
var json;
var totalQuestionCount = 0;
var lastFrom = "any";
var lastTo = "any";
var selectCounter = {
	"unit": 0,
	"from": 0,
	"to": 0
}
	
// Configuration variables
var showConsoleLog = true;
var shuffleQuestion = false;
var shuffleAnswer = false;

// Envirnoment variables
var switching = false;
var inMenu = true;
const DEFAULT_JSON_URL = "data/data.json";

function onReady() {
	$("body").off("tap").on("tap", function() {
		$.each(selectCounter, function(key, value) {
			if (!$("#" + key + "-button").find(":hover").length)
				$("#" + key).blur();
		});
	});
	$("body").on("swipeleft", function() {
		nextQuestion();
	});
	$("body").on("swiperight", function() {
		prevQuestion();
	});
	$("#shuffleQuestionflip").on("change", function(event, ui) {
		shuffleQuestion = ($("#shuffleQuestionflip").val() == "on") ? true : false;
	});
	$("#shuffleAnswerflip").on("change", function(event, ui) {
		shuffleAnswer = ($("#shuffleAnswerflip").val() == "on") ? true : false;
	});
	$("#unit").on("change", populateSet);
	$("#from").on("change", changeRange);
	$("#to").on("change", changeRange);
}

/* Menu Events */
function showMenu() {
	inMenu = true;
	$(".progressCircle").animate({marginTop: (-$(".progressCircle").height() - parseInt($(".progressCircle").css("padding").replace("px", ""))) + "px"}, "fast").fadeOut("fast");
	$(".footer .forward").off("tap").removeClass("nextPage").addClass("start").html("Start").show();
	$(".prevPage").hide();
	$(".submit").hide();
	$(".start").off("tap").on("tap", function() {
		if (contentInit())
			quizInit();
	});
}

function hideMenu() {
	inMenu = false;
	$(".progressCircle").fadeIn("fast").animate({marginTop: "0px"}, "fast");
	$(".start").off("tap").removeClass("start").addClass("nextPage").html("Next");
	$(".nextPage").off("tap").on("tap", function(e) {
		e.preventDefault();
		nextQuestion();
	});
	$(".prevPage").off("tap").on("tap", function(e) {
		e.preventDefault();
		prevQuestion();
	});
}

function populateUnit() {
	if (instruction.unit) {
		$("#unit").children("[value='any']").select();
		$("#unit").children("[value!='any']").remove();
		lastFrom = "any";
		lastTo = "any";
		$.each(instruction.unit, function(index, value) {
			if (!value.base) {
				$unit = $("<option></option>").attr("name", value.name).attr("value", value.name).html(value.name);
				$("#unit").append($unit);
				if (value.default) {
					$("#unit").val(value.name);
				}
			}
		});
		$("#unit").trigger("change");
	}
}

function populateSet() {
	if (instruction.unit) {
		if ($("#from").val() != "any")
			lastFrom = $("#from").val();
		if ($("#to").val() != "any")
			lastTo = $("#to").val();
		$("#from").children("[value='any']").select();
		$("#to").children("[value='any']").select();
		$("#from").children("[value!='any']").remove();
		$("#to").children("[value!='any']").remove();
		$.each(instruction.unit, function(index, value) {
			if (!value.base && value.name == $("#unit").val() && value.set) {
				$.each(value.set, function(i, set) {
					$fromSet = $("<option></option>").attr("name", set.id).attr("value", set.id).html(set.id);
					$toSet = $fromSet.clone();
					$("#from").append($fromSet);
					$("#to").append($toSet);
					if (set.id == lastFrom)
						$("#from").val(lastFrom);
					if (set.id == lastTo)
						$("#to").val(lastTo);
				});
			}
		});
		$("#from").trigger("change");
		$("#to").trigger("change");
	}
}

function changeRange() {
	var from = $("#from").val();
	var to = $("#to").val();
	if (instruction.unit && ($("#unit").val() != "any") && (from != "any" || to != "any")) {
		loadJSON();
		if (showConsoleLog)
			console.log("Searching questions (from: '" + $("#unit").val() + " " + from + "', to: '" + $("#unit").val() + " " + to + "')...");
		$.each(instruction.unit, function(unitIndex, unit) {
			if (unit.name == $("#unit").val() && instruction.question && instruction.question.length > 0) {
				if (showConsoleLog)
					console.log("-\tUnit type (name: '" + unit.name + "') found");
				var lectureArray = new Array();
					if (showConsoleLog)
				console.log("-\tSearching in " + unit.set.length + " sets...");
				if (from != "any" && to != "any" && parseInt(from) > parseInt(to)) {
					var temp = from;
					from = to;
					to = temp;
				}
				$.each(unit.set, function(setIndex, set) {
					if ((from == "any" || set.id >= parseInt(from)) && 
						(to == "any" || set.id <= parseInt(to))) {
							if (showConsoleLog)
								console.log ("-\t-\t" + set.title + " found");
							if (set.group && set.group.length > 0) {
								$.each(set.group, function(lectureId, lecture) {
									if ($.inArray(lecture, lectureArray) == -1) {
										if (showConsoleLog)
											console.log("-\t-\t-\tPushing " + lecture); 
										lectureArray.push(lecture);
									}
								});
							}
					}
				});
				if (showConsoleLog)
					console.log("Searching " + lectureArray.length + " lectures in " + instruction.question.length + " questions...");
				var questionArray = new Array();
				clearSearchResultBar($(".listBar"));
				$.each(instruction.question, function(index, questionData) {
					if (questionData.stamp && questionData.stamp.length > 0) {
						$.each(questionData.stamp, function(stampIndex, stamp) {
							if ($.inArray(stamp.id, lectureArray) != -1 && $.inArray(questionData, questionArray) == -1) {
								questionArray.push(questionData);
								fillSearchResultBar($(".listBar"), index);
							}
						});
					}
					/* If question does not have a stamp, put it in the list */
					else {
						if ($.inArray(questionData, questionArray) == -1) {
							questionArray.push(questionData);
							fillSearchResultBar($(".listBar"), index);
						}
					}
				});
				instruction.question = questionArray;
				if (showConsoleLog)
					console.log("-\tFound " + questionArray.length + " questions");
				return;
			}
		});
	}
	else
		fillSearchResultBar($(".listBar"), -1);
}

function clearSearchResultBar($listBar) {
	$listBar.children(".chunkBar").removeClass("filled");
}

function fillSearchResultBar($listBar, index) {
	if (index < 0 || index > $listBar.children(".chunkBar").length)
		$listBar.children(".chunkBar").addClass("filled");
	else
		$($listBar.children(".chunkBar")[index]).addClass("filled");
}

function loadSearchResultBar($listBar, chunkCount) {
	for (var i = 0; i < chunkCount; i++) {
		var $chunkBar = $("<div></div>").addClass("chunkBar").css("width", (($listBar.width()/chunkCount - 1) / $listBar.width() * 100) + "%");
		$listBar.append($chunkBar);
	}
}
/* End of Menu Events */

/* Data Processing Methods */
function loadJSON(url) {
	if (url) {
		if (showConsoleLog) {
			console.log(" -------------------- ");
			console.log("|  nanoHUB Quiz Core |");
			console.log("|    1.0 by David    |");
			console.log(" -------------------- ");
		}
		$(".ui-loader").show();
		var localStorageReady = false;
		if(typeof(Storage) !== "undefined") {
			// Code for localStorage/sessionStorage.
			if (showConsoleLog)
				console.log("Loading JSON from local storage...");
			localStorageReady = true;
			json = localStorage.getItem("data");
			if (instruction = JSON.parse(json)) {
				if (showConsoleLog)
					console.log("-\tLocal storage JSON loaded");
			}
			else {
				if (showConsoleLog)
					console.log("-\tNo data in local storage");
			}
		} 
		else {
			if (showConsoleLog)
				console.log("-\tLocal storage not supported");
			localStorageReady = false;
		}
		loadRemoteJSON(url, localStorageReady);
	}
	else if(json) {
		instruction = JSON.parse(json);
		if (showConsoleLog)
			console.log("JSON reloaded");
	}
}

function loadRemoteJSON(url, localStorageReady) {
	if (showConsoleLog)
		console.log("Loading JSON from server...");
	$.ajax({
		dataType: "jsonp",
		url: url,
		jsonp: "callback",
		success: function(data) {
			if (showConsoleLog)
				console.log("-\tRemote JSON loaded, comparing...");
			//$(".ui-loader").hide();
			if (instruction && instruction.version && data.version && parseFloat(instruction.version) >= parseFloat(data.version)) {
				if (showConsoleLog)
					console.log("-\tLocal storage is newer or the same as remote");
			}
			else {
				json = JSON.stringify(data);
				instruction = data;
				if (localStorageReady) {
					localStorage.setItem("data", json);
					if (showConsoleLog)
						console.log("-\tJSON stored to local storage");
				}
			}
			loadDefaultJSON(localStorageReady);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			if (showConsoleLog)
				console.log("-\tCould not fetch JSON from server: ", textStatus, errorThrown);
			loadDefaultJSON();
		}
	});
}

function loadDefaultJSON(localStorageReady) {
	if (showConsoleLog)
		console.log("Loading default JSON...");
	$.ajax({
		dataType: "json",
		url: DEFAULT_JSON_URL,
		success: function(data) {
			if (showConsoleLog)
				console.log("-\tDefault JSON loaded, comparing...");
			$(".ui-loader").hide();
			if (instruction && instruction.version && data.version && parseFloat(instruction.version) >= parseFloat(data.version)) {
				if (showConsoleLog)
					console.log("-\tLocal storage is newer or the same as default");
			}
			else {
				json = JSON.stringify(data);
				instruction = data;
				if (localStorageReady) {
					localStorage.setItem("data", json);
					if (showConsoleLog)
						console.log("-\tJSON stored to local storage");
				}
			}
			MenuInit();
		}
	});
}

function MenuInit() {
	if (showConsoleLog)
		console.log("JSON loading finished");
	showMenu();
	populateUnit();
	loadSearchResultBar($(".listBar"), instruction.question.length);
	fillSearchResultBar($(".listBar"), -1);
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
		
		if (showConsoleLog)
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
			if (showConsoleLog)
				console.log("-\tLoading vignette " + (index + 1) + "/" + data.length + "(" + nodeData.type + ") ...");
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
			if (showConsoleLog)
				console.log("-\tLoading answer " + (index + 1) + "/" + data.length + "(" + nodeData.type + ") ...");
			
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
/* End of Data Processing Methods */

/* Quiz Interface Events */
function quizInit() {
	
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
	$(".knob").off("change").on("change", function() {
		$(".progressInfo").html(question.toString() + "/" + questionCount.toString());
	});
	
	$(':mobile-pagecontainer').off("pagecontainershow").on("pagecontainershow", function(event, ui) {
		onQuestionSwitch(event, ui);
	});
	if (showConsoleLog)
		console.log("Initialization success\nSwitching to question " + question.toString() + " ...");
	$(':mobile-pagecontainer').pagecontainer( "change", "#q" + question.toString(), { transition: "slideup"} );
}

function nextQuestion() {
	if (question < questionCount) {
		if (switching || inMenu)
			return;
		else
			switching = true;
		if (showConsoleLog)
			console.log("Switching to question " + (question + 1).toString() + " ...");
		$(':mobile-pagecontainer').pagecontainer( "change", "#q" + (question + 1).toString(), { transition: "slide"} );
	}
	else
		question = questionCount;
}

function prevQuestion() {
	if (question > 1)  {
		if (switching || inMenu)
			return;
		else
			switching = true;
		if (showConsoleLog)
			console.log("Switching to question " + (question - 1).toString() + " ...");
		$(':mobile-pagecontainer').pagecontainer( "change", "#q" + (question - 1).toString(), { transition: "slide", reverse: "true"} );
	}
	else
		question = 1;
}

function onResize() {
	$(".progressCircle").css("margin-left", $(window).width() * 0.5 - $(".progressCircle").width() * 0.5 - parseInt($(".progressCircle").css("padding").replace("px", "")) + "px");
}

function onQuestionSwitch(event, ui) {
	if ($(".ui-page-active")) {
		var targetQuestion = $(".ui-page-active").attr("id");
		if (targetQuestion == "settings") {
			loadJSON();
			showMenu();
		}
		else if (targetQuestion) {
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
	if (inMenu)
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
	$(".answer").off("tap");
	$(".submit").off("tap");
	
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
/* End of Quiz Interface Events */