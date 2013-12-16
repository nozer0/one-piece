<?php
/**
 * Author   : nozer0
 * Email    : c.nozer0@gmail.com
 * Modified : 2013-09-23 21:35
 */
interface DBConnection {
}

/**
 * Class PgsqlConnection
 */
class PgsqlConnection implements DBConnection {
	private $connection;

	/**
	 * @param array $config
	 */
	function __construct(array $config = array(
		'host'     => 'localhost',
		'dbname'   => 'testdb',
		'user'     => 'test',
		'password' => 'test')) {
		$str = "";
		if (is_array($config)) {
			foreach ($config as $k => $v) {
				$str .= $k . "=" . $v . " ";
			}
		}
		if (!$this->connection = @pg_connect($str)) {
			die('connect fail' . pg_last_error());
		}
		//echo pg_options();
		//echo ' success<br>';
	}

	public function _execute($sql) {
		return pg_query($this->connection, pg_escape_string($sql));
	}

	public function begin() {
		return pg_query($this->connection, 'BEGIN');
	}

	public function commit() {
		return pg_query($this->connection, 'COMMIT');
	}

	public function rollback() {
		return pg_query($this->connection, 'ROLLBACK');
	}

	public function insert($table, $data, $columns = null) {
		if (!$table || !$data) {
			throw new Exception('missing required arguments');
		}
		$str = 'INSERT INTO "' . $table . '"';
		if ($columns) {
			$str .= '(' . pg_escape_string(is_array($columns) ? implode(', ', $columns) : $columns) . ')';
		}
		if (is_array($data)) {
			if ($columns) {
				$clauses = array();
				foreach ($data as $v) {
					array_push($clauses, is_string($v) ? '\'' . pg_escape_string($v) . '\'' : $v);
				}
				$str .= ' VALUES (' . implode(', ', $clauses) . ')';
			} else {
				$clauses = array();
				$clauses2 = array();
				foreach ($data as $k => $v) {
					array_push($clauses, $k);
					array_push($clauses2, is_string($v) ? '\'' . pg_escape_string($v) . '\'' : $v);
				}
				$str .= '(' . implode(', ', $clauses) . ') VALUES (' . implode(', ', $clauses2) . ')';
			}
		} else {
			$str .= $data . ')';
		}
//		echo $str . '<br>';
		$ret = pg_query($this->connection, $str);
		if ($ret) {
			//echo 'insert: ' . pg_affected_rows($ret) . '<br>';
			/** @noinspection SpellCheckingInspection */
			$ret = pg_query("SELECT currval('\"{$table}_id_seq\"')");
			if ($ret) {
				$ret = pg_fetch_row($ret);
				return $ret[0];
			}
		}
		return false;
	}

	private function _getWhereClause($conditions) {
		if (empty($conditions)) {
			return '';
		}
		$keys = array_keys($conditions);
		if ($keys !== array_keys($keys)) { // array
			$conditions = array($conditions);
		}
		$str = array();;
		foreach ($conditions as $condition) {
			$clauses = array();
			foreach ($condition as $k => $v) {
				if (is_array($v)) {
					if ($op = $v['op']) {
						$v = $v['value'];
					}
					if (!$op || $op === 'in') {
						$arr = array();
						foreach ($v as $vv) {
							array_push($arr, is_numeric($vv) ? $vv : '\'' . pg_escape_string($vv) . '\'');
						}
						$v = $k . ' IN (' . implode(', ', $arr) . ')';
					} else {
						$v = $k . ' ' . pg_escape_string($op) . (is_numeric($v) ? ' ' . $v : ' \'' . pg_escape_string($v) . '\'');
					}
				} else {
					$v = $k . ' = ' . (is_numeric($v) ? $v : '\'' . pg_escape_string($v) . '\'');
				}
				array_push($clauses, $v);
			}
			array_push($str, implode(' AND ', $clauses));
		}
		return ' WHERE ' . implode(' OR ', $str);
	}

	public function update($table, $data, $conditions = null) {
		if (!$table || !$data) {
			throw new Exception('missing required arguments');
		}
		$id = isset($data['id']) ? $data['id'] : null;
		unset($data['id']);
		$clauses = array();
		foreach ($data as $k => $v) {
			array_push($clauses, $k . ' = ' . (is_array($v) ? $v['expr'] : (is_numeric($v) ? $v : '\'' . pg_escape_string($v) . '\'')));
		}
		//echo 'UPDATE "' . $table . '" SET ' . implode(', ', $clauses) . ($id ? ' WHERE id = ' . $id : $this->_getWhereClause($conditions));
		$ret = pg_query($this->connection, 'UPDATE "' . $table . '" SET ' . implode(', ', $clauses) . ($id ? ' WHERE id = ' . $id : $this->_getWhereClause($conditions)));
		if ($ret) {
			$ret = $id ? $id : pg_affected_rows($ret);
			return $ret ? $ret : 0;
		}
		return false;
	}

	public function delete($table, $conditions = null) {
		if (!$table) {
			throw new Exception('missing required arguments');
		}
		$ret = pg_query($this->connection, 'DELETE FROM "' . $table . '"' . (is_string($conditions) ? ' WHERE id = ' . $conditions : $this->_getWhereClause($conditions)));
		if ($ret) {
			$ret = pg_affected_rows($ret);
			return $ret ? $ret : 0;
		}
		return false;
	}

	public function find($table, $id, $columns = null) {
		if (!$table || !$id) {
			throw new Exception('missing required arguments');
		}
		$ret = pg_query($this->connection, 'SELECT ' . ($columns ? pg_escape_string(is_array($columns) ? implode(', ', $columns) : $columns) : '*') . ' FROM "' . $table . '" WHERE id = ' . $id);
		if ($ret) {
			$ret = pg_fetch_array($ret, null, PGSQL_ASSOC);
			return $ret ? $ret : null;
		}
		return false;
	}

	public function query($table, $columns = null, $conditions = null, $order = null, $page = null, $offset = null, $limit = null) {
		if (!$table) {
			throw new Exception('missing required arguments');
		}
		$str = 'SELECT ' . ($columns ? pg_escape_string(is_array($columns) ? implode(', ', $columns) : $columns) : '*') . ' FROM "' . $table . '"' . $this->_getWhereClause($conditions);
		$str .= ' ORDER BY ' . ($order ? $order . ', id' : 'id');
		if ($limit) {
			$str .= ' LIMIT ' . $limit;
		}
		if (!$offset) {
			$offset = 0;
		}
		if ($page) {
			if (!$limit) {
				$limit = 20;
			}
			$str .= ' OFFSET ' . (($page === -1 ? ceil($this->count($table, $conditions) / $limit) - 1 : $page - 1) * $limit + $offset);
		} else if ($offset) {
			$str .= ' OFFSET ' . $offset;
		}
		$ret = pg_query($this->connection, $str);
		if ($ret) {
			/*
			echo 'fetch_all:<br>';
			var_dump(pg_fetch_all($ret));
			echo '<br>fetch_column:<br>';
			var_dump(pg_fetch_all_columns($ret, 1));
			echo '<br>fetch_array:<br>';
			var_dump(pg_fetch_array($ret, 1, PGSQL_ASSOC));
			echo '<br>fetch_assoc:<br>';
			var_dump(pg_fetch_assoc($ret, 1));
			echo '<br>fetch_object:<br>';
			var_dump(pg_fetch_object($ret, 1, "Test"));
			echo '<br>fetch_result:<br>';
			var_dump(pg_fetch_result($ret, 1, 'b'));
			echo '<br>fetch_row:<br>';
			var_dump(pg_fetch_row($ret, 1));
			*/
			$ret = pg_fetch_all($ret);
			return $ret ? $ret : null;
		}
		return false;
	}

	public function count($table, $conditions = null) {
		if (!$table) {
			throw new Exception('missing required arguments');
		}
		$ret = pg_query($this->connection, 'SELECT count(*) FROM "' . $table . '"' . $this->_getWhereClause($conditions));
		if ($ret) {
			$ret = pg_fetch_row($ret);
			return $ret ? $ret[0] : 0;
		}
		return false;
	}

	public function last_error() {
		return pg_last_error();
	}

	public function test() {
		$rows = pg_copy_to($this->connection, '"Test"');
		var_dump($rows);
		$this->delete('Test');
		pg_copy_from($this->connection, '"Test"', $rows);
		$this->query('Test');
	}
	/* It's not necessary for non-persistent connection, will close automatically
	function __destruct() {
		if ($this->connection) {
			pg_close($this->connection);
		}
	}
	*/
}

/*
$conn = new PgsqlConnection();
$conn->delete('Test', 'where id=5');
$conn->insert('Test', array(5, 'a', 'a'));
$conn->update('Test', array('a'=> 'abc', 'b'=> 'dfe'), 'where id=4');
$conn->query('Test', NULL, 'order by id');
*/
