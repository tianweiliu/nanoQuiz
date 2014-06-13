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
var wrongList;
var savedList;
	
// Configuration variables
var showConsoleLog = true;
var shuffleQuestion = false;
var shuffleAnswer = false;

// Envirnoment variables
var switching = false;
var inMenu = true;
var localStorageReady = false;

// Envirnoment constants
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
	$(".filter input").on("change", changeRange);
	$(".menuBtn").on("tap", function(e) {
        e.preventDefault();
		if ($(this).hasClass("menu")) {
			$(':mobile-pagecontainer').pagecontainer( "change", "#settings", { transition: "slidedown" } );
		}
		else {
			if (instruction)
				window.history.back();
		}
    });
}

/* Menu Events */
function showMenu() {
	inMenu = true;
	$(".menuBtn").removeClass("menu").addClass("close");
	$(".progressCircle").animate({marginTop: (-$(".progressCircle").height() - parseInt($(".progressCircle").css("padding").replace("px", ""))) + "px"}, "fast").fadeOut("fast");
	$(".footer .forward").off("tap").removeClass("nextPage").addClass("start").html("Start").show();
	$(".prevPage").hide();
	$(".submit").hide();
	$(".start").off("tap").on("tap", function() {
		if (contentInit())
			quizInit();
	});
	$(".wrongList").hide();
	$(".savedList").hide();
	changeRange();
}

function hideMenu() {
	inMenu = false;
	$(".menuBtn").removeClass("close").addClass("menu").show();
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
	loadJSON();
	if (instruction.unit && ($("#unit").val() != "any") && (from != "any" || to != "any")) {
		if (showConsoleLog)
			console.log("Searching questions (from: '" + $("#unit").val() + " " + from + "', to: '" + $("#unit").val() + " " + to + "')...");
			
		/* Search range type */
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
				/* Push all ids in selected group to lectureArray (aka baseUnitArray) */
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
				applyFilter(lectureArray);
				return;
			}
		});
	}
	else 
		applyFilter();
}

function applyFilter(lectureArray) {
	if (showConsoleLog) {
		if (lectureArray)
			console.log("Searching " + lectureArray.length + " lectures in " + instruction.question.length + " questions...");
		else
			console.log("Searching in " + instruction.question.length + " questions...");
	}
	var questionArray = new Array();
	clearSearchResultBar($(".listBar"));
	$.each(instruction.question, function(index, questionData) {
		/* Apply to filter */
		if (!questionData.id)
			return true;
		if ($("#radio-choice-h-2b").checkboxradio().is(":checked")) {
			if ($.inArray(questionData.id, wrongList) == -1)
				return true;
		}
		else if ($("#radio-choice-h-2c").is(":checked")) {
			if ($.inArray(questionData.id, savedList) == -1)
				return true;
		}
		
		/* Apply to range */
		if (questionData.stamp && questionData.stamp.length > 0) {
			$.each(questionData.stamp, function(stampIndex, stamp) {
				if ((!lectureArray || ($.inArray(stamp, lectureArray) != -1)) && ($.inArray(questionData, questionArray) == -1)) {
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
			
			/* Load wrong list */
			var wrongListJSON = localStorage.getItem("wrongList");
			if (!wrongListJSON)
				wrongList = new Array();
			else {
				try {
					wrongList = JSON.parse(wrongListJSON);
					if (!wrongList)
						wrongList = new Array();
				}
				catch(e) {
					wrongList = new Array();
				}
			}
			
			/* Load saved list */
			//localStorage.setItem("savedList", null);
			var savedListJSON = localStorage.getItem("savedList");
			if (!savedListJSON)
				savedList = new Array();
			else {
				try {
					savedList = JSON.parse(savedListJSON);
					if (!savedList)
						savedList = new Array();
				}
				catch(e) {
					savedList = new Array();
				}
			}
		} 
		else {
			if (showConsoleLog)
				console.log("-\tLocal storage not supported");
			localStorageReady = false;
		}
		loadDefaultJSON(url);
	}
	else if(json) {
		instruction = JSON.parse(json);
		if (showConsoleLog)
			console.log("JSON reloaded");
	}
}

function loadRemoteJSON(url) {
	$(".checking").show();
	$(".updateResult").hide();
	if (showConsoleLog)
		console.log("Loading JSON from server...");
	$.ajax({
		dataType: "jsonp",
		url: url,
		jsonp: "callback",
		success: function(data) {
			$(".checking").hide();
			if (showConsoleLog)
				console.log("-\tRemote JSON loaded, comparing...");
			//$(".ui-loader").hide();
			if (instruction && instruction.version && data.version && parseFloat(instruction.version) >= parseFloat(data.version)) {
				$refreshJSON = $("<a href='#'>Refresh</a>").on("tap", function(e) {
					e.preventDefault();
					loadRemoteJSON(url);
				});
				$(".updateResult").html("Up to date | ").append($refreshJSON).show();
				if (showConsoleLog)
					console.log("-\tLocal storage is newer or the same as remote");
			}
			else {
				if (showConsoleLog)
							console.log("-\tVersion " + data.version + " found on server");
				$updateJSON = $("<a href='#'>Click here to update</a>").on("tap", function(e) {
					e.preventDefault();
					json = JSON.stringify(data);
					instruction = data;
					if (localStorageReady) {
						localStorage.setItem("data", json);
						if (showConsoleLog)
							console.log("-\tJSON stored to local storage");
					}
					$refreshJSON = $("<a href='#'>Refresh</a>").on("tap", function(e) {
						e.preventDefault();
						loadRemoteJSON(url);
					});
					$(".updateResult").html("Up to date | ").append($refreshJSON).show();
					MenuInit();
				});
				$(".updateResult").html($updateJSON).show();
			}
			//loadDefaultJSON();
		},
		error: function(jqXHR, textStatus, errorThrown) {
			$(".checking").hide();
			if (showConsoleLog)
				console.log("-\tCould not fetch JSON from server: ", textStatus, errorThrown);
			$refreshJSON = $("<a href='#'>Refresh</a>").on("tap", function(e) {
				e.preventDefault();
				loadRemoteJSON(url);
			});
			$(".updateResult").html("Cannot connect to server | ").append($refreshJSON).show();
			//loadDefaultJSON();
		}
	});
}

function loadDefaultJSON(url) {
	if (showConsoleLog)
		console.log("Loading default JSON...");
	$.ajax({
		dataType: "json",
		url: DEFAULT_JSON_URL,
		success: function(data) {
			if (showConsoleLog)
				console.log("-\tDefault JSON loaded, comparing...");
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
			loadRemoteJSON(url);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			if (showConsoleLog)
				console.log("-\tCould not load default JSON: ", textStatus, errorThrown);
			if (instruction)
				MenuInit();
			loadRemoteJSON(url);
		}
	});
}

function MenuInit() {
	$(".ui-loader").hide();
	if (showConsoleLog)
		console.log("JSON loading finished");
	showMenu();
	populateUnit();
	loadSearchResultBar($(".listBar"), instruction.question.length);
	fillSearchResultBar($(".listBar"), -1);
}

function contentInit() {
	if (instruction && instruction.question) {
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
	// Assign question id
	if (data.id)
		$wrapper.attr("id", data.id);
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
	$(".knob").off("change", onKnobChange).on("change", onKnobChange);
	
	$(':mobile-pagecontainer').off("pagecontainershow").on("pagecontainershow", function(event, ui) {
		onQuestionSwitch(event, ui);
	});
	if (showConsoleLog)
		console.log("Initialization success\nSwitching to question " + question.toString() + " ...");
	$(':mobile-pagecontainer').pagecontainer( "change", "#q" + question.toString(), { transition: "slideup"} );
}

function onKnobChange() {
	$(".progressInfo").html(question.toString() + "/" + questionCount.toString());
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
		window.history.back();
		//$(':mobile-pagecontainer').pagecontainer( "change", "#q" + (question - 1).toString(), { transition: "slide", reverse: "true"} );
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
			//loadJSON();
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
			
	$(".wrongList").hide();
	$(".savedList").removeClass("saved").addClass("notSaved").show();
	if ($("#q" + question).children(".content").attr("id")) {
		if ($.inArray($("#q" + question).children(".content").attr("id"), wrongList) != -1) {
			$(".wrongList").show().off("tap").on("tap", function(){
				wrongList.splice($.inArray($("#q" + question).children(".content").attr("id"), wrongList), 1);
				if (localStorageReady)
					localStorage.setItem("wrongList", JSON.stringify(wrongList));
				if (showConsoleLog)
					console.log("Question \"" + $("#q" + question).children(".content").attr("id") + "\" removed from wrong list");
				$(this).hide();
			});
		}
		$(".savedList").off("tap").on("tap", function() {
			if ($(this).hasClass("notSaved")) {
				savedList.push($("#q" + question).children(".content").attr("id"));
				if (localStorageReady)
					localStorage.setItem("savedList", JSON.stringify(savedList));
				if (showConsoleLog)
					console.log("Question \"" + $("#q" + question).children(".content").attr("id") + "\" added to saved list");
				$(this).removeClass("notSaved").addClass("saved");
				return;
			}
			else if($(this).hasClass("saved")) {
				savedList.splice($.inArray($("#q" + question).children(".content").attr("id"), savedList), 1);
				if (localStorageReady)
					localStorage.setItem("savedList", JSON.stringify(savedList));
				if (showConsoleLog)
					console.log("Question \"" + $("#q" + question).children(".content").attr("id") + "\" removed from saved list");
				$(this).removeClass("saved").addClass("notSaved");
				return;
			}
		});
		if ($.inArray($("#q" + question).children(".content").attr("id"), savedList) != -1) {
			$(".savedList").removeClass("notSaved").addClass("saved");
		}
		else {
			$(".savedList").removeClass("saved").addClass("notSaved");
		}
	}
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
		if ($("#q" + question).children(".content").attr("id") && $.inArray($("#q" + question).children(".content").attr("id"), wrongList) == -1) {
			wrongList.push($("#q" + question).children(".content").attr("id"));
			if (localStorageReady)
				localStorage.setItem("wrongList", JSON.stringify(wrongList));
			if (showConsoleLog)
				console.log("Question \"" + $("#q" + question).children(".content").attr("id") + "\" added to wrong list");
		}
	}
}
/* End of Quiz Interface Events */