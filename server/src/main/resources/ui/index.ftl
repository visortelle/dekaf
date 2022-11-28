<html lang="en">

<head>
  <meta charset="UTF-8"/>
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="ie=edge"/>

  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=''/>
  <link
    href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;600&amp;family=Fira+Sans:wght@400;700&amp;display=swap"
    rel="stylesheet"/>

  <!-- Include stylesheets here is the only way I found to get rid of annoying styles flickering NextJS bug after each
  page reload. -->
  <link href="/ui/static/entrypoint.css" rel="stylesheet">
  </link>

  <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png"/>
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png"/>
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png"/>

  <!-- Empty script tag as chrome bug fix, see https://stackoverflow.com/a/42969608/943337 -->
  <script></script>

  <title>X-Ray</title>
</head>

<body>

<script src="/ui/static/entrypoint.js"></script>

<script>
  document.addEventListener('DOMContentLoaded', function () {
    pulsarUiEntrypoint.renderApp(document.getElementById('pulsar-ui-root'));
  });
</script>

<div id="pulsar-ui-root">

</div>

</body>

</html>
