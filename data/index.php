<?php 
	$string = file_get_contents("data.json");
	if (array_key_exists('callback', $_GET) && $string) {
		header('Content-Type: text/javascript; charset=utf8');
		echo($_GET["callback"]."(".$string.")");
	}
?>