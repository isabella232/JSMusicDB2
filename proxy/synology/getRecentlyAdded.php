<?
$requestHeader="";
$opts = array('http' => array('method' => "GET", 'header' => $requestHeader));

$url = $_GET["server"] . '/webman/3rdparty/AudioStation/webUI/audio_browse.cgi';
$postOptions = "start=0&limit=9&action=browse&server=musiclib_music_latestalbum&target=musiclib_music_latestalbum&album_name=&artist_name=&album_artist_name=&category_name=&library=shared&sort=&dir=ASC";

$options = array('http' => array('header' => "Content-type: application/x-www-form-urlencoded\r\n" . "Cookie: id=" . $_GET["sid"] . "\r\n" . "X-SYNO-TOKEN:" . $_GET["sid"] . "\r\n", 'method' => 'POST', 'content' => $postOptions), );

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
ob_start('ob_gzhandler');
header('Content-type: application/json');
echo $result;
?>