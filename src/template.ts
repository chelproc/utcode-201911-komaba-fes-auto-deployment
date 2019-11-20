export default {

"index.html": `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="style.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
</head>
<body>
    <h1 id="header">Hello World!</h1>
    <script src="script.js"></script>
</body>
</html>
`.trim(),

"script.js": `
function clicked() {
	alert("Hello!");
}
$("#header").click(clicked);
`.trim(),

"style.css": `
#header {
    color: red;
}
`.trim()

};