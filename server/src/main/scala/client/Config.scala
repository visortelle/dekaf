package client

import _root_.schema.Config as SchemaConfig

case class Config(
    pulsarServiceUrl: String,
    pulsarAdminUrl: String,
    schema: SchemaConfig
)
