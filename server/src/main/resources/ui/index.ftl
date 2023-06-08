<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8"/>
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"/>

  <link href="/ui/static/fonts.css" rel="stylesheet"/>
  <link href="/ui/static/globals.css" rel="stylesheet"/>
  <link href="/ui/static/dist/entrypoint.css" rel="stylesheet"/>

  <link data-rh="true" rel="icon" type="image/png" sizes="16x16" href="/ui/static/favicon/favicon-16x16.png"/>

  <title data-rh="true">X-Ray</title>
</head>

<body>

<div id="pulsar-ui-root"></div>

<script src="/ui/static/dist/entrypoint.js"></script>

<script>
  document.addEventListener('DOMContentLoaded', function () {
    const config = {
      publicUrl: '${publicUrl}',
      pulsarInstance: {
        name: '${pulsarInstance.name}',
        color: '${pulsarInstance.color}',
        brokerServiceUrl: '${pulsarInstance.brokerServiceUrl}',
        webServiceUrl: '${pulsarInstance.webServiceUrl}'
      },
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
