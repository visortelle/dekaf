<!DOCTYPE html>
<html lang="en">

<head>
  <#-- Origin-relative on purpose. An absolute base href breaks the UI when Dekaf is
       opened on a host other than DEKAF_PUBLIC_BASE_URL. See #349. -->
  <base href="${basePath}" />

  <meta charset="UTF-8"/>
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"/>

  <link href="ui/static/fonts.css" rel="stylesheet"/>
  <link href="ui/static/globals.css" rel="stylesheet"/>
  <link href="ui/static/dist/entrypoint.css" rel="stylesheet"/>

  <link data-rh="true" rel="icon" type="image/png" sizes="16x16" href="ui/static/favicon/favicon-16x16.png"/>

  <title data-rh="true">Dekaf</title>
</head>

<body>

<div id="pulsar-ui-root"></div>

<script src="ui/static/dist/entrypoint.js"></script>

<script>
  document.addEventListener('DOMContentLoaded', function () {
    const config = {
      publicBaseUrl: '${publicBaseUrl}',
      basePath: '${basePath}',
      pulsarName: '${pulsarName}',
      pulsarColor: '${pulsarColor}',
      pulsarBrokerUrl: '${pulsarBrokerUrl}',
      pulsarWebUrl: '${pulsarWebUrl}',

      buildInfo: {
        name: '${buildInfo.name}',
        version: '${buildInfo.version}',
        builtAtString: '${buildInfo.builtAtString}',
        builtAtMillis: ${buildInfo.builtAtMillis?c},
      }
    };

    pulsarUiEntrypoint.renderApp(document.getElementById('pulsar-ui-root'), config);
  });

</script>

</body>

</html>
