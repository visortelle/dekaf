## sbt project compiled with Scala 3

- Check for dependency updates with `sbt dependencyUpdates`

## Debug with local pulsar-client

- [ ] In cloned apache/pulsar repo run the string below to
make client artifacts available at the local Maven repository.

```bash
mvn install -pl :pulsar-client-original,:pulsar-client-admin-original -am -DskipTests
```

- [ ] Delete pulsar client artifacts from your local Coursier repository.

```bash
# MacOS
 rm -rf  ~/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/apache/pulsar/
```

- [ ] Add the `Global / resolvers += Resolver.mavenLocal` string to build.sbt.

- [ ] Reload the sbt project.
