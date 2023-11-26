package consumer.message_filter.basic_message_filter.operations

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class AnyTestOp(
    op: TestOpArrayAny |
        TestOpArrayAll |
        TestOpBoolEquals |
        TestOpIsDefined |
        TestOpIsNull |
        TestOpStringEndsWith |
        TestOpStringEquals |
        TestOpStringIncludes |
        TestOpStringMatchesRegex |
        TestOpStringStartsWith
)

object AnyTestOp:
    def fromPb(v: pb.AnyTestOp): AnyTestOp =
        v.op match
            case pb.AnyTestOp.Op.OpIsDefined(op) => AnyTestOp(op = TestOpIsDefined.fromPb(op))
            case pb.AnyTestOp.Op.OpIsNull(op) => AnyTestOp(op = TestOpIsNull.fromPb(op))
            case pb.AnyTestOp.Op.OpBoolEquals(op) => AnyTestOp(op = TestOpBoolEquals.fromPb(op))
            case pb.AnyTestOp.Op.OpStringEndsWith(op) => AnyTestOp(op = TestOpStringEndsWith.fromPb(op))
            case pb.AnyTestOp.Op.OpStringStartsWith(op) => AnyTestOp(op = TestOpStringStartsWith.fromPb(op))
            case pb.AnyTestOp.Op.OpStringEquals(op) => AnyTestOp(op = TestOpStringEquals.fromPb(op))
            case pb.AnyTestOp.Op.OpStringIncludes(op) => AnyTestOp(op = TestOpStringIncludes.fromPb(op))
            case pb.AnyTestOp.Op.OpStringMatchesRegex(op) => AnyTestOp(op = TestOpStringMatchesRegex.fromPb(op))
            case _ => throw new Exception("Unsupported AnyTestOp")

    def toPb(v: AnyTestOp): pb.AnyTestOp =
        v.op match
            case op: TestOpIsDefined => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpIsDefined(TestOpIsDefined.toPb(op)))
            case op: TestOpIsNull => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpIsNull(TestOpIsNull.toPb(op)))
            case op: TestOpBoolEquals => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpBoolEquals(TestOpBoolEquals.toPb(op)))
            case op: TestOpStringEndsWith => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpStringEndsWith(TestOpStringEndsWith.toPb(op)))
            case op: TestOpStringStartsWith => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpStringStartsWith(TestOpStringStartsWith.toPb(op)))
            case op: TestOpStringEquals => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpStringEquals(TestOpStringEquals.toPb(op)))
            case op: TestOpStringIncludes => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpStringIncludes(TestOpStringIncludes.toPb(op)))
            case op: TestOpStringMatchesRegex => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpStringMatchesRegex(TestOpStringMatchesRegex.toPb(op)))

