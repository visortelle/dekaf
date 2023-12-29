package demo.tenants.cqrs.shared

import org.apache.pulsar.client.impl.schema.JSONSchema

trait Convertible[A, B] {
  def convert(a: A): B
}

trait Randomizable[T]:
  def random: T

trait Schemable[T]:
  def schema: JSONSchema[T]

trait Message
object Message:
  def random[T <: Message](implicit ev: Randomizable[T]): T = ev.random

  def schema[T <: Message](using sch: Schemable[T]): JSONSchema[T] = sch.schema


trait Command extends Message
trait Event extends Message

