<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8"/>
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"/>

  <link href="/ui/static/fonts.css" rel="stylesheet"/>
  <link href="/ui/static/globals.css" rel="stylesheet"/>
  <link href="/ui/static/dist/entrypoint.css" rel="stylesheet"/>

  <link rel="apple-touch-icon" sizes="180x180" href="/ui/static/favicon/apple-touch-icon.png"/>
  <link rel="icon" type="image/png" sizes="32x32" href="/ui/static/favicon/favicon-32x32.png" data-react-helmet="true"/>
  <link rel="icon" type="image/png" sizes="16x16" href="/ui/static/favicon/favicon-16x16.png" data-react-helmet="true"/>

  <title>X-Ray</title>
</head>

<body>

<div id="pulsar-ui-root"></div>

<script src="/ui/static/dist/entrypoint.js"></script>

<script>
  document.addEventListener('DOMContentLoaded', function () {
    const config = {
      publicUrl: '${publicUrl}',
      buildInfo: {
        name: '${buildInfo.name}',
        version: '${buildInfo.version}',
        builtAtString: '${buildInfo.builtAtString}',
        builtAtMillis: '${buildInfo.builtAtMillis}',
      }
    };

    pulsarUiEntrypoint.renderApp(document.getElementById('pulsar-ui-root'), config);
  });

</script>

</body>

</html>
