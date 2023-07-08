package config

import zio.Config

case class AuthConfig(
    jwt: String
)

case class AppConfig(
    brokerServiceUrl: String,
    webServiceUrl: String,
    auth: AuthConfig,
    clusterNames: List[String]
)

//val config = AppConfig(
//  brokerServiceUrl = "pulsar://localhost:6650",
//  webServiceUrl = "http://localhost:8080",
//  auth = AuthConfig(jwt = ""),
//  clusterNames = List("cluster-local")
//)

val config = AppConfig(
  brokerServiceUrl = "pulsar+ssl://cluster-d.o-xy6ek.snio.cloud:6651",
  webServiceUrl = "https://cluster-d.o-xy6ek.snio.cloud",
  auth = AuthConfig(jwt = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik5rRXdSVVU1TUVOQlJrWTJNalEzTVRZek9FVkZRVVUyT0RNME5qUkRRVEU1T1VNMU16STVPUSJ9.eyJodHRwczovL3N0cmVhbW5hdGl2ZS5pby91c2VybmFtZSI6ImNsdXN0ZXItYi1hZG1pbkBvLXh5NmVrLmF1dGguc3RyZWFtbmF0aXZlLmNsb3VkIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLnN0cmVhbW5hdGl2ZS5jbG91ZC8iLCJzdWIiOiJ6NUQxcVIyTllxN250amhZN0dHSnZqNkRrcG1PRk1EREBjbGllbnRzIiwiYXVkIjoidXJuOnNuOnB1bHNhcjpvLXh5NmVrOmluc3RhbmNlLWQiLCJpYXQiOjE2ODg1NDUwMTgsImV4cCI6MTY4OTE0OTgxOCwiYXpwIjoiejVEMXFSMk5ZcTdudGpoWTdHR0p2ajZEa3BtT0ZNREQiLCJzY29wZSI6ImFkbWluIGFjY2VzcyIsImd0eSI6ImNsaWVudC1jcmVkZW50aWFscyIsInBlcm1pc3Npb25zIjpbImFkbWluIiwiYWNjZXNzIl19.Cz8g3BhWR9evpChrkDdm4hX4Duhd-7bObqV5j8-eQ4Fs317VVEQKmUayQESTTgITzYF4qIZ82vZi9hJkjyeApdG4vCY2XqRkmoR-Ic7cEg9ffgyZHatgJRMTI2gqondEop2PRdGmjGGjjonWlNP-qcZZ19Cs0egapG-3UZKkC9pXaPpeCpOB4Q4sEoRXO6YAAfILmBQqScU6aXI0pP2DpsxHkupp3YVGrL-m13Jdu-EvdSuzZ5v6VOqzR8m1w3XDDkfHCBsD345Q-Ov7gPOlJ6MxNLkmFJO6EdNYjGqoxWHj58orRrZaNr4W_xjwOGb0ByVYUW4K-zFc3bbx4BKR4A"),
  clusterNames = List("cluster-d")
)
