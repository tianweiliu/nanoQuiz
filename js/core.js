// Data variables 
var config;
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
var remoteUrl;
var sendAnalytics = true;

// Envirnoment variables
var packageLoaded = false;
var switching = false;
var inMenu = true;
var localStorageReady = false;

// Envirnoment constants
const PACKAGE_JSON_URL = "data/package.json";
const DEFAULT_JSON_URL = "data/data.json";

// Package variables
var supportEmail;

// Session variables
var session = {
	start: -1,
	answers: []
};
var myChart;
var myTimer;

function pageInit() {
	//$("body").pagecontainer()
	$("#removeFromWrongList").popup()
	$("#removeFromWrongList").popup('open').hide();
	window.location.href=window.location.href.replace("&ui-state=dialog", "");
}

function loadPackage() {
	if (showConsoleLog) {
		console.log(" -------------------- ");
		console.log("|      nanoQuiz      |");
		console.log("|    2.0 by David    |");
		console.log(" -------------------- ");
	}
	pageInit();
	if (showConsoleLog)
		console.log("Loading package configuration...");
	$.ajax({
		dataType: "json",
		url: PACKAGE_JSON_URL,
		success: function(data) {
			if (showConsoleLog)
				console.log("-\tPackage configuration loaded.");
			loadConfig(data);
			onReady();
			if (remoteUrl) {
				loadJSON(remoteUrl);
			}
			else {
				loadJSON(DEFAULT_JSON_URL);
			}
			$(':mobile-pagecontainer').on('pagecontainershow', onPageSwitch);
			showLanding();
		},
		error: function(jqXHR, textStatus, errorThrown) {
			if (showConsoleLog)
				console.error("-\tCould not load package configuration.", textStatus, errorThrown);
			$(".title").text("Could not load package configuration.");
		}
	});
}

function loadConfig(config) {
	if (showConsoleLog)
		console.log("Package: " + config.app.name + " - " + config.package.title + ": " + config.package.subtitle);
	document.title = config.app.name + " - " + config.package.title + ": " + config.package.subtitle;
	if (showConsoleLog)
		console.log("-\tInitiating landing page...");
	$(".banner")
		.attr("src", "data/" + config.package.banner)
		.attr("alt", config.app.name + " - " + config.package.title + ": " + config.package.subtitle);
	$(".title").text(config.package.title);
	$(".subtitle").text(config.package.subtitle);
	$(".department").text(config.package.department);
	$(".school")
		.attr("src", "data/" + config.package.schoolLogo)
		.attr("alt", config.package.school);
	supportEmail = config.package.support;
	$(".supportLink")
		.attr("href", "mailto:" + supportEmail)
		.text(supportEmail);
	$(".nanoQuiz").html("Powered by <a href=\"https://github.com/tianweiliu/nanoQuiz\">nanoQuiz</a>");
	remoteUrl = config.package.url;
	if (showConsoleLog)
		console.log("-\tLanding page ready.");
	if (ga) {
		ga('create', config.analytics.id, 'auto');
		ga('set', {
		  'appName': config.app.name + " - " + config.package.title + ": " + config.package.subtitle,
		  'appVersion': config.app.version
		});
		aPage("landing");
		if (showConsoleLog)
			console.log("-\tGoogle Analytics ready.");
	}
}

function onReady() {
	if (showConsoleLog)
		console.log("-\tInitiating interface events...");
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
    if (showConsoleLog)
		console.log("-\tInterface events initialized.");
}

/* Menu Events */
function onPageSwitch(event, ui) {
	if ($(".ui-page-active")) {
		setNav($(".ui-page-active").attr("id"));
		switching = false;
	}
}

function setNav(page) {
	if (page == "settings") {
		showMenu();
		aPage(page);
	}
	else if (page == "welcome") {
		showLanding();
		aPage(page);
	}
	else if (page == "result") {
		showResult();
		aPage(page);
	}
}

function hideQuestion() {
	inMenu = true;
	var circleHeight = $(".progressCircle").height() + parseInt($(".progressCircle").css("padding").replace("px", "")) * 2;
	$(".progressCircle").animate({marginTop: -circleHeight + "px"}, "slow", function() {
		$(".progressCircle").hide();
	});
	$(".prevPage").hide();
	$(".submit").hide();
	$(".wrongList").hide();
	$(".savedList").hide();
}

function showResult() {
	hideQuestion();
	$(".menuBtn").removeClass("menu").addClass("close").show();
	$(".footer .forward").hide();
	var numCorrect = 0;
	$.each(session.answers, function(index, answer) {
		if (answer.correct) {
			numCorrect++;
		}
	});
	if (session.start > -1) {
		var data = [
		    {
		        value: session.answers.length - numCorrect,
		        color:"#F7464A",
		        highlight: "#FF5A5E",
		        label: "Incorrect"
		    },
		    {
		        value: numCorrect,
		        color: "#46BFBD",
		        highlight: "#5AD3D1",
		        label: "Correct"
		    },
		    {
		        value: questionCount - session.answers.length,
		        color: "#FDB45C",
		        highlight: "#FFC870",
		        label: "Unanswered"
		    }
		];
		var ctx = $("#myChart").get(0).getContext("2d");
		myChart = new Chart(ctx).Pie(data);
	}
}

function showLanding() {
	hideQuestion();
	$(".footer .forward").off("tap").removeClass("nextPage").addClass("start").html("Start").show();
	$(".start").off("tap").on("tap", function() {
		$(':mobile-pagecontainer').pagecontainer( "change", "#settings", { transition: "slidedown" } );
	});
}

function showMenu() {
	hideQuestion();
	$(".menuBtn").removeClass("menu").addClass("close");
	$(".footer .forward").off("tap").removeClass("nextPage").addClass("start").html("Start").show();
	$(".start").off("tap").on("tap", function() {
		if (contentInit())
			quizInit();
	});
	changeRange();
	loadSearchResultBar($(".listBar"), instruction.question.length);
	$.each(instruction.question, function(index, questionData) {
		if ($.inArray(questionData.id, wrongList) != -1)
			fillSearchResultBar($(".listBar"), index, "wrong");
		else if ($.inArray(questionData.id, savedList) != -1)
			fillSearchResultBar($(".listBar"), index, "saved");
		else
			fillSearchResultBar($(".listBar"), index, "filled");
	});
}

function hideMenu() {
	inMenu = false;
	$(".menuBtn").removeClass("close").addClass("menu").show();
	$(".progressCircle").show().animate({marginTop: "0px"}, "fast");
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
				$unit = $("<option></option>").attr("name", value.name).attr("value", value.id).html(value.name);
				$("#unit").append($unit);
				if (value.default) {
					$("#unit").val(value.id);
				}
			}
		});
		$("#unit").trigger("change");
	}
}

function populateSet() {
	if (instruction.unit && instruction.unit.length > 0 && instruction.question && instruction.question.length > 0) {
		if ($("#from").val() != "any")
			lastFrom = $("#from").val();
		if ($("#to").val() != "any")
			lastTo = $("#to").val();
		$("#from").children("[value='any']").select();
		$("#to").children("[value='any']").select();
		$("#from").children("[value!='any']").remove();
		$("#to").children("[value!='any']").remove();
		$.each(instruction.unit, function(index, value) {
			//Find selected unit type
			if (!value.base && value.id == $("#unit").val()) {
				if (showConsoleLog)
					console.log("Calculating range of unit type: " + value.id);
				var unitStartIndex = -1;
				var unitLastIndex = -1;
				$.each(instruction.question, function(qIndex, qValue) {
					if (qValue[value.id] != undefined) {
						//Question contains this unit type
						/*
						if (showConsoleLog)
							console.log("-\tQuestion ('" + qValue.id + "') contains unit type ('" + value.id + "'), value: " + qValue[value.id]);
						*/
						if (qValue[value.id] < unitStartIndex || unitStartIndex == -1)
							unitStartIndex = qValue[value.id];
						if (qValue[value.id] > unitLastIndex || unitLastIndex == -1)
							unitLastIndex = qValue[value.id];
					}
				});
				if (showConsoleLog)
					console.log("-\tFrom " + unitStartIndex + " to " + unitLastIndex);
				for (var i = unitStartIndex; i <= unitLastIndex; i++) {
					$fromSet = $("<option></option>").attr("name", i).attr("value", i).html(i);
					$toSet = $fromSet.clone();
					$("#from").append($fromSet);
					$("#to").append($toSet);
					if (i == lastFrom)
						$("#from").val(lastFrom);
					if (i == lastTo)
						$("#to").val(lastTo);
				}
				return false;
			}
		});
		$("#from").trigger("change");
		$("#to").trigger("change");
	}
	else if(showConsoleLog) {
		console.error("Invalid json, populateSet abort.");
	}
}

function changeRange() {
	var unitType = $("#unit").val();
	var from = $("#from").val();
	var to = $("#to").val();
	loadJSON();
	if (instruction.question && instruction.question.length > 0 && ($("#unit").val() != "any") && (from != "any" || to != "any")) {
		if (showConsoleLog)
			console.log("Searching questions (from: '" + $("#unit").val() + " " + from + "', to: '" + $("#unit").val() + " " + to + "')...");
		$(".rangeSelected").text("from: '" + $("#unit").val() + " " + from + "', to: '" + $("#unit").val() + " " + to + "'");
		if (from != "any" && to != "any" && parseInt(from) > parseInt(to)) {
			var temp = from;
			from = to;
			to = temp;
		}
		var questionList = new Array();
		/* Search selected range in all questions */
		$.each(instruction.question, function(qIndex, qValue) {
			if (showConsoleLog) {
				console.log("-\tQuestion: " + qValue.id);
			}
			if (qValue[unitType] != undefined) {
				//Question contains this unit type
				if (showConsoleLog) {
					console.log("-\t-\tUnit type ('" + unitType + "') found");
				}
				$.each(qValue[unitType], function(unitIndex, unitValue) {
					if ((from == "any" || unitValue >= parseInt(from)) && 
						(to == "any" || unitValue <= parseInt(to))) {
						//Question in selected range
						if (showConsoleLog)
							console.log ("-\t-\tQuestion in range")
						if ($.inArray(qValue.id, questionList) == -1) {
							if (showConsoleLog)
								console.log("-\t-\tPushing " + qValue.id); 
							questionList.push(qValue.id);
						}
						return false;
					}
				});
			}
		});
		applyFilter(questionList);
	}
	else {
		$(".rangeSelected").text("all");
		applyFilter();
	}
}

function applyFilter(questionList) {
	if (showConsoleLog) {
		if (questionList)
			console.log("Retrieving " + questionList.length + " questions in " + instruction.question.length + " questions...");
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
		if (!questionList || ($.inArray(questionData.id, questionList) != -1) && ($.inArray(questionData, questionArray) == -1)) {
			questionArray.push(questionData);
			if ($.inArray(questionData.id, wrongList) != -1)
				fillSearchResultBar($(".listBar"), index, "wrong");
			else if ($.inArray(questionData.id, savedList) != -1)
				fillSearchResultBar($(".listBar"), index, "saved");
			else
				fillSearchResultBar($(".listBar"), index, "filled");

		}
	});
	instruction.question = questionArray;
	if (showConsoleLog)
		console.log("-\tFound " + questionArray.length + " questions");
}

function clearSearchResultBar($listBar) {
	$listBar.children(".chunkBar").removeClass("filled").removeClass("saved").removeClass("wrong");
}

function fillSearchResultBar($listBar, index, barClass) {
	if (index < 0 || index > $listBar.children(".chunkBar").length)
		$listBar.children(".chunkBar").addClass(barClass);
	else
		$($listBar.children(".chunkBar")[index]).addClass(barClass);
}

function loadSearchResultBar($listBar, chunkCount) {
	$listBar.empty();
	for (var i = 0; i < chunkCount; i++) {
		var $chunkBar = $("<div></div>").addClass("chunkBar").css("width", (($listBar.width()/chunkCount - 1) / $listBar.width() * 100) + "%");
		$listBar.append($chunkBar);
	}
}
/* End of Menu Events */

/* Data Processing Methods */
function loadJSON(url) {
	if (url) {
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
				console.warn("-\tLocal storage not supported");
			localStorageReady = false;
			aException("Local storage not supported", false);
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
				console.warn("-\tCould not fetch JSON from server: ", textStatus, errorThrown);
			$refreshJSON = $("<a href='#'>Refresh</a>").on("tap", function(e) {
				e.preventDefault();
				loadRemoteJSON(url);
			});
			$(".updateResult").html("Cannot connect to server | ").append($refreshJSON).show();
			aException("Could not fetch JSON from server: " + textStatus + ": " + errorThrown, false);
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
			if (url != DEFAULT_JSON_URL)
				loadRemoteJSON(url);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			if (showConsoleLog)
				console.error("-\tCould not load default JSON: ", textStatus, errorThrown);
			if (instruction)
				MenuInit();
			else
				$(".updateResult").html("Cannot load instructions | ").append($refreshJSON).show();
			if (url != DEFAULT_JSON_URL)
				loadRemoteJSON(url);
			aException("Could not load default JSON: " + textStatus + ": " + errorThrown, (instruction == null));
		}
	});
}

function MenuInit() {
	$(".ui-loader").hide();
	if (showConsoleLog)
		console.log("JSON loading finished");
	populateUnit();
}

function contentInit() {
	if (instruction && instruction.question) {
		$(".ui-loader").show();

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
		
		return true;
	}
	return false;
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
	if (data.id) {
		$wrapper.attr("id", data.id);
		var $questionId = $("<div></div>").addClass("questionId").text(data.id);
		$wrapper.append($questionId);
	}
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
			var $sprite = $("<img />").addClass("answerImage").attr("alt", "answer").attr("src", "data/" + data.sprite.content);
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
						$image.attr("src", "data/" + nodeData.content);
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

	/* Reset session variables */
	var timestamp = Date.now();
	session = {
		start: timestamp,
		answers: []
	};
	myTimer = setInterval(function() {
		var timestamp = Date.now();
		$(".timeElapsed").text(moment.duration(timestamp - session.start).format("h:mm:ss", { trim: false }));
	}, 1000);
	
	$(".questionList").html("<div class=\"questionLink\"><a href=\"#result\">Statistics</a><div class=\"clearfloat\"></div></div>");
	$(".questions").each(function(index, element) {
		$(this).find(".question").children(".bullet").html((index + 1).toString() + ".");
		var $questionLink = $("<a></a>")
			.attr("href", "#" + $(this).attr("id"))
			.text($(this).attr("id").replace("q", "") + ". " + $(this).children("div").attr("id"));
		var $questionStatus = $("<div></div>")
			.addClass("questionStatus unanswered")
			.text("Unanswered");
		var $questionList = $("<div></div>")
			.addClass("questionLink")
			.attr("id", "qLink" + $(this).attr("id").replace("q", ""))
			.append($questionLink)
			.append($questionStatus)
			.append("<div class=\"clearfloat\"></div>");
		$(".questionList").append($questionList);
	});
	
	/* Load all answer sprites */
	$(".answerImage").each(function(index, element) {
		var sprite = this;
		$("<img />").load(function(e) {
			var tmpImg = this;
			$(sprite).parent("div").find(".answerSprite").each(function(index, element) {
				if ($(this).attr("id")) {
					var i = $(this).attr("id").substr(0, 1);
					var c = $(this).attr("id").substr(2);
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
	$(".knob").off("change", onKnobChange).on("change", onKnobChange).val(0).trigger("change");;
	
	uiEvent();

	$(':mobile-pagecontainer').off("pagecontainershow").on("pagecontainershow", function(event, ui) {
		onQuestionSwitch(event, ui);
	});

	if (showConsoleLog)
		console.log("Initialization success\nSwitching to question " + question.toString() + " ...");
	$(':mobile-pagecontainer').pagecontainer( "change", "#q" + question.toString(), { transition: "slideup"} );

	$(".ui-loader").hide();
}

function onKnobChange() {
	$(".progressInfo").html(session.answers.length.toString() + "/" + questionCount.toString());
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
		//window.history.back();
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
		if (targetQuestion == "settings" || targetQuestion == "welcome" || targetQuestion == "result") {
			setNav(targetQuestion);
		}
		else if (targetQuestion) {
			targetQuestion = parseInt(targetQuestion.replace("q", ""));
			if (targetQuestion && targetQuestion <= questionCount) {
				question = targetQuestion;
				switchQuestion();
			}
			aPage($(".ui-page-active .content").attr("id"));
		}
		switching = false;
	}
}

function switchQuestion() {
	if (inMenu)
		hideMenu();
	console.log(question);
	if (question >= questionCount)
		$(".nextPage").html("Result").show().off('tap').on('tap', function(e) {
			e.preventDefault();
			$(":mobile-pagecontainer").pagecontainer('change', '#result', {transition:'slideup'});
		});
	else if($("#q" + question).find(".locked").length > 0)
		$(".nextPage").html("Next").show().off('tap').on('tap', function(e){
			e.preventDefault();
			nextQuestion();
		});
	else
		$(".nextPage").html("Skip").show().off('tap').on('tap', function(e){
			e.preventDefault();
			nextQuestion();
		});
	if (question <= 1) 
		$(".prevPage").hide();
	else
		$(".prevPage").show();
	if ($("#q" + question).find(".selected").length > 0 && $("#q" + question).find(".locked").length == 0) 
		$(".submit").text("Submit").show();
	else if($("#q" + question).find(".locked").length > 0)
		$(".submit").text("Next").show();
	else
		$(".submit").hide();
			
	$(".wrongList").hide();
	$(".savedList").removeClass("saved").addClass("notSaved").show();
	if ($("#q" + question).children(".content").attr("id")) {
		if ($.inArray($("#q" + question).children(".content").attr("id"), wrongList) != -1) {
			$(".wrongList").show().off("tap").on("tap", function(event){
				event.preventDefault();
				$("#removeFromWrongList").show().popup('open', {
					positionTo: 'window',
					transition: 'pop'
				});
				$("#confirmRemoveFromWrongList").off('tap').on('tap', function(event) {
					event.preventDefault();
					wrongList.splice($.inArray($("#q" + question).children(".content").attr("id"), wrongList), 1);
					if (localStorageReady)
						localStorage.setItem("wrongList", JSON.stringify(wrongList));
					if (showConsoleLog)
						console.log("Question \"" + $("#q" + question).children(".content").attr("id") + "\" removed from wrong list");
					$(".wrongList").hide();
					$("#removeFromWrongList").popup('close');
				});
				$("#cancelRemoveFromWrongList").off('tap').on('tap', function(event) {
					event.preventDefault();
					$("#removeFromWrongList").popup('close');
				});
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
		if ($(this).text() == "Next")
			nextQuestion();
		else
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
		if ($("#q" + question).find(".selected").length > 0 && $("#q" + question).find(".locked").length == 0) 
			$(".submit").text("Submit").show();
		else if($("#q" + question).find(".locked").length > 0)
			$(".submit").text("Next").show();
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
	$(".submit").text("Next");
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
		$(".wrongList").show();
		if ($("#q" + question).children(".content").attr("id") && $.inArray($("#q" + question).children(".content").attr("id"), wrongList) == -1) {
			wrongList.push($("#q" + question).children(".content").attr("id"));
			if (localStorageReady)
				localStorage.setItem("wrongList", JSON.stringify(wrongList));
			if (showConsoleLog)
				console.log("Question \"" + $("#q" + question).children(".content").attr("id") + "\" added to wrong list");
		}
		$("#qLink" + question).children(".questionStatus")
			.removeClass("unanswered")
			.addClass("wrong")
			.text("Incorrect");
		aAnswer($("#q" + question).children(".content").attr("id"), false);
	}
	else {
		$("#qLink" + question).children(".questionStatus")
			.removeClass("unanswered")
			.addClass("correct")
			.text("Correct");
		aAnswer($("#q" + question).children(".content").attr("id"), true);
	}
	uiEvent();
}

function uiEvent() {
	$(".knob").val(session.answers.length).trigger("change");
	var numCorrect = 0;
	$.each(session.answers, function(index, answer) {
		if (answer.correct) {
			numCorrect++;
		}
	});
	if (session.answers.length > 0) {
		$(".scoreLabel").text("Your score: ");
		$(".scoreVal").text(Math.round(numCorrect / session.answers.length * 100));
	}
	else {
		$(".scoreLabel").text("Your haven't answered any question yet.");
		$(".scoreVal").text("");
	}
	$(".numQuestions").text(questionCount);
	$(".totalAnswered").text(session.answers.length);
	$(".totalCorrect").text(numCorrect);
	$(".totalWrong").text(session.answers.length - numCorrect);
}
/* End of Quiz Interface Events */

/* Analytics Events */
function aPage(page) {
	if (ga) {
		ga('send', 'screenview', {'screenName': page});
	}
}

function aException(err, isFatal) {
	if (ga)
		ga('send', 'exception', {
		  'exDescription': err,
		  'exFatal': isFatal
		});
}

function aAnswer(id, correct) {
	var timestamp = Date.now();
	session.answers.push({
		id: id,
		correct: correct,
		timestamp: timestamp.toString()
	});
	if (ga && sendAnalytics) {
		ga('send', 'event', 'answer', correct ? 'correct' : 'wrong', id, {
			'timestamp': timestamp.toString()
		});
	}
}
/* End of Analytics Events */