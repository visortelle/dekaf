package consumer.message_filter.basic_message_filter.operations

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class AnyTestOp(
    op: TestOpArrayAny |
        TestOpArrayAll |
        TestOpBoolIsFalse |
        TestOpBoolIsTrue |
        TestOpIsDefined |
        TestOpIsNull |
        TestOpNumberEq |
        TestOpNumberLt |
        TestOpNumberLte |
        TestOpNumberGt |
        TestOpNumberGte |
        TestOpStringEndsWith |
        TestOpStringEquals |
        TestOpStringIncludes |
        TestOpStringMatchesRegex |
        TestOpStringStartsWith |
        TestOpMatchesJSON |
        TestOpContainsJSON
)

object AnyTestOp:
    def fromPb(v: pb.AnyTestOp): AnyTestOp =
        v.op match
            case pb.AnyTestOp.Op.OpIsDefined(op) => AnyTestOp(op = TestOpIsDefined.fromPb(op))
            case pb.AnyTestOp.Op.OpIsNull(op) => AnyTestOp(op = TestOpIsNull.fromPb(op))
            case pb.AnyTestOp.Op.OpBoolIsFalse(op) => AnyTestOp(op = TestOpBoolIsFalse.fromPb(op))
            case pb.AnyTestOp.Op.OpBoolIsTrue(op) => AnyTestOp(op = TestOpBoolIsTrue.fromPb(op))
            case pb.AnyTestOp.Op.OpNumberEq(op) => AnyTestOp(op = TestOpNumberEq.fromPb(op))
            case pb.AnyTestOp.Op.OpNumberLt(op) => AnyTestOp(op = TestOpNumberLt.fromPb(op))
            case pb.AnyTestOp.Op.OpNumberLte(op) => AnyTestOp(op = TestOpNumberLte.fromPb(op))
            case pb.AnyTestOp.Op.OpNumberGt(op) => AnyTestOp(op = TestOpNumberGt.fromPb(op))
            case pb.AnyTestOp.Op.OpNumberGte(op) => AnyTestOp(op = TestOpNumberGte.fromPb(op))
            case pb.AnyTestOp.Op.OpStringEndsWith(op) => AnyTestOp(op = TestOpStringEndsWith.fromPb(op))
            case pb.AnyTestOp.Op.OpStringStartsWith(op) => AnyTestOp(op = TestOpStringStartsWith.fromPb(op))
            case pb.AnyTestOp.Op.OpStringEquals(op) => AnyTestOp(op = TestOpStringEquals.fromPb(op))
            case pb.AnyTestOp.Op.OpStringIncludes(op) => AnyTestOp(op = TestOpStringIncludes.fromPb(op))
            case pb.AnyTestOp.Op.OpStringMatchesRegex(op) => AnyTestOp(op = TestOpStringMatchesRegex.fromPb(op))
            case pb.AnyTestOp.Op.OpArrayAny(op) => AnyTestOp(op = TestOpArrayAny.fromPb(op))
            case pb.AnyTestOp.Op.OpArrayAll(op) => AnyTestOp(op = TestOpArrayAll.fromPb(op))
            case pb.AnyTestOp.Op.OpMatchesJson(op) => AnyTestOp(op = TestOpMatchesJSON.fromPb(op))
            case pb.AnyTestOp.Op.OpContainsJson(op) => AnyTestOp(op = TestOpContainsJSON.fromPb(op))
            case _ => throw new Exception("Unsupported AnyTestOp")

    def toPb(v: AnyTestOp): pb.AnyTestOp =
        v.op match
            case op: TestOpIsDefined => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpIsDefined(TestOpIsDefined.toPb(op)))
            case op: TestOpIsNull => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpIsNull(TestOpIsNull.toPb(op)))
            case op: TestOpBoolIsFalse => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpBoolIsFalse(TestOpBoolIsFalse.toPb(op)))
            case op: TestOpBoolIsTrue => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpBoolIsTrue(TestOpBoolIsTrue.toPb(op)))
            case op: TestOpNumberEq => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpNumberEq(TestOpNumberEq.toPb(op)))
            case op: TestOpNumberLt => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpNumberLt(TestOpNumberLt.toPb(op)))
            case op: TestOpNumberLte => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpNumberLte(TestOpNumberLte.toPb(op)))
            case op: TestOpNumberGt => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpNumberGt(TestOpNumberGt.toPb(op)))
            case op: TestOpNumberGte => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpNumberGte(TestOpNumberGte.toPb(op)))
            case op: TestOpStringEndsWith => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpStringEndsWith(TestOpStringEndsWith.toPb(op)))
            case op: TestOpStringStartsWith => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpStringStartsWith(TestOpStringStartsWith.toPb(op)))
            case op: TestOpStringEquals => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpStringEquals(TestOpStringEquals.toPb(op)))
            case op: TestOpStringIncludes => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpStringIncludes(TestOpStringIncludes.toPb(op)))
            case op: TestOpStringMatchesRegex => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpStringMatchesRegex(TestOpStringMatchesRegex.toPb(op)))
            case op: TestOpArrayAny => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpArrayAny(TestOpArrayAny.toPb(op)))
            case op: TestOpArrayAll => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpArrayAll(TestOpArrayAll.toPb(op)))
            case op: TestOpMatchesJSON => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpMatchesJson(TestOpMatchesJSON.toPb(op)))
            case op: TestOpContainsJSON => pb.AnyTestOp(op = pb.AnyTestOp.Op.OpContainsJson(TestOpContainsJSON.toPb(op)))

