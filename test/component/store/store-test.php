<?php
header('Content-Type', 'application/json');
/** @noinspection SpellCheckingInspection */
require('dbconnection.php');
$conn = new PgsqlConnection();
$ret = array();
$args = explode('/', $_SERVER['PATH_INFO']);
$table = $args[1];
foreach ($_GET as $k => $v) {
	if ($v === '' && is_numeric($k)) {
		unset($_GET[$k]);
	}
}

switch ($_SERVER["REQUEST_METHOD"]) {
	case 'POST':
		if (empty($_GET)) {
			if (isset($args[2])) {
				$_POST['id'] = $args[2];
				$id = $conn->update($table, $_POST);
			} else {
				$id = $conn->insert($table, $_POST);
			}
			if ($id) {
				$ret['success'] = true;
				$ret['id'] = $id;
			} else {
				$ret['success'] = false;
				$ret['error'] = $conn->last_error();
			}
		} else if (!isset($args[2])) {
			$cnt = $conn->update($table, $_POST, $_GET);
			if ($cnt !== false) {
				$ret['success'] = true;
				$ret['count'] = $cnt;
			} else {
				$ret['success'] = false;
				$ret['error'] = $conn->last_error();
			}
		}
		break;
	case 'DELETE':
		if (!isset($args[2]) || $args[2] !== 'destroy') {
			if (isset($args[2])) {
				$cnt = $conn->delete($table, $args[2]);
			} else {
				foreach ($_GET as $k => $v) {
					if (preg_match('/_(?:[<>]=?|!?=|in|like)$/', $k)) {
						$_GET[preg_replace('/_([<>]=?|!?=|in|like)$/', ' \\1', $k)] = $v;
						unset($_GET[$k]);
					}
				}
				$cnt = $conn->delete($table, $_GET);
			}
			if ($cnt !== false) {
				$ret['success'] = true;
				$ret['count'] = $cnt;
			} else {
				$ret['success'] = false;
				$ret['error'] = $conn->last_error();
			}
		} else if ($conn->_execute('TRUNCATE TABLE ' . $table . ';ALTER SEQUENCE ' . $table . '_id_seq RESTART WITH 1;')) {
			$ret['success'] = true;
		} else {
			$ret['success'] = false;
			$ret['error'] = $conn->last_error();
		}
		break;
	case 'GET':
		if (isset($args[2])) {
			$data = $conn->find($table, $args[2]);
			if ($data !== false) {
				$ret['success'] = true;
				$ret['data'] = $data;
			} else {
				$ret['success'] = false;
				$ret['error'] = $conn->last_error();
			}
		} else {
			$modifiers = isset($_GET['__modifiers']) ? $_GET['__modifiers'] : null;
			unset($_GET['__modifiers']);

			$data = $conn->query($table, null, $_GET, $modifiers && isset($modifiers['order']) ? $modifiers['order'] : null, $modifiers && isset($modifiers['page']) ? (int)$modifiers['page'] : null, $modifiers && isset($modifiers['offset']) ? (int)$modifiers['offset'] : null, $modifiers && isset($modifiers['limit']) ? (int)$modifiers['limit'] : null);
			if ($data !== false) {
				$ret['success'] = true;
				$ret['data'] = $data;
				$ret['count'] = $modifiers ? $conn->count($table, $_GET) : count($data);
			} else {
				$ret['success'] = false;
				$ret['error'] = $conn->last_error();
			}
		}
}
echo json_encode($ret, JSON_NUMERIC_CHECK);
