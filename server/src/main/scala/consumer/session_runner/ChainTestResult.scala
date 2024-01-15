package consumer.session_runner

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestResult(
    var isOk: Boolean,
    error: Option[String]
)

object TestResult:
    def fromPb(v: pb.TestResult): TestResult =
        TestResult(
            isOk = v.isOk,
            error = v.error
        )
    def toPb(v: TestResult): pb.TestResult =
        pb.TestResult(
            isOk = v.isOk,
            error = v.error
        )

case class ChainTestResult(
    var isOk: Boolean,
    results: Vector[TestResult]
)

object ChainTestResult:
    def fromPb(v: pb.ChainTestResult): ChainTestResult =
        ChainTestResult(
            isOk = v.isOk,
            results = v.results.map(TestResult.fromPb).toVector
        )
    def toPb(v: ChainTestResult): pb.ChainTestResult =
        pb.ChainTestResult(
            isOk = v.isOk,
            results = v.results.map(TestResult.toPb)
        )
