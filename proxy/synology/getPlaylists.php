<?
// proxy the cookie to the synology streaming script
/*
 $requestHeader = "Cookie: id=" . $_GET["sid"] . "\r\n";
 foreach (getallheaders() as $name => $value) {
 echo "$name: $value\n";
 }
 */
$requestHeader="";
$opts = array('http' => array('method' => "GET", 'header' => $requestHeader));

$url = $_GET["server"] . '/webman/3rdparty/AudioStation/webUI/audio_browse.cgi';
$postOptions = "start=0&limit=1000&action=browse&target=musiclib_music_playlist&server=musiclib_music_playlist&sort=&dir=ASC";

$options = array('http' => array('header' => "Content-type: application/x-www-form-urlencoded\r\n" . "Cookie: id=" . $_GET["sid"] . "\r\n", 'method' => 'POST', 'content' => $postOptions), );

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
ob_start('ob_gzhandler');
header('Content-type: application/json');
echo $result;
?>