<!DOCTYPE html>
<html lang="en">

<head>
  <base href="${publicBaseUrl}/" />

  <meta charset="UTF-8"/>
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"/>

  <link href="ui/static/fonts.css" rel="stylesheet"/>
  <link href="ui/static/globals.css" rel="stylesheet"/>
  <link href="ui/static/dist/entrypoint.css" rel="stylesheet"/>

  <link data-rh="true" rel="icon" type="image/png" sizes="16x16" href="ui/static/favicon/favicon-16x16.png"/>

  <title data-rh="true">Pulsocat</title>
</head>

<body>

<div id="pulsar-ui-root"></div>

<script src="ui/static/dist/entrypoint.js"></script>

<script>
  document.addEventListener('DOMContentLoaded', function () {
    const config = {
      publicBaseUrl: '${publicBaseUrl}',
      pulsarName: '${pulsarName}',
      pulsarColor: '${pulsarColor}',
      pulsarBrokerUrl: '${pulsarBrokerUrl}',
      pulsarHttpUrl: '${pulsarHttpUrl}',

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
