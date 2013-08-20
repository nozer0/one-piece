<?php
header("Access-Control-Allow-Origin: *");
$jsonp = isset($_GET['jsonp']) ? $_GET['jsonp'] : null;
unset($_REQUEST['_jsonp']);
if ($_SERVER['REQUEST_METHOD'] === 'GET' && (!$jsonp || isset($_GET['method']))) {
	$res = 'get response';
} else {
	$type = isset($_REQUEST['type']) ? $_REQUEST['type'] : null;
	switch ($type) {
		case 'document':
			header("Content-type: text/html");
			$res = '<html><head><title>document response</title></head><body></body></html>';
			break;
		case 'json':
			header('content-type: application/json');
			$res = json_encode($_REQUEST, JSON_NUMERIC_CHECK);
			break;
		case null: // text
			header('content-type: text/plain');
			$res = json_encode($_REQUEST, JSON_NUMERIC_CHECK);
			break;
		case 'file':
			header('content-type: text/html; charset=utf-8');
			$arr = $_FILES['file']['tmp_name'];
			$cnt = count($arr);
			if ($cnt && !empty($arr)) {
				$res = $cnt > 1 ? file_get_contents($arr[0]) . ', ' . file_get_contents($arr[1]) : file_get_contents($arr);
			}
			break;
		default:
			header('content-type: text/plain');
			$res = $type . ' response';
	}
}
echo $jsonp ? $jsonp . "('$res')" : $res;