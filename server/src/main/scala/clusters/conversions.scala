package clusters

import com.tools.teal.pulsar.ui.clusters.v1.clusters as pb
import scala.jdk.CollectionConverters.*
import org.apache.pulsar
import pulsar.common.policies.data.{AutoFailoverPolicyData, AutoFailoverPolicyType, ClusterData, FailureDomain, NamespaceIsolationData, BrokerNamespaceIsolationData}
import pulsar.client.api.ProxyProtocol

object conversions:
    def clusterDataToPb(cd: ClusterData): pb.ClusterData =
        pb.ClusterData(
            serviceUrl = Option(cd.getServiceUrl),
            serviceUrlTls = Option(cd.getServiceUrlTls),
            brokerServiceUrl = Option(cd.getBrokerServiceUrl),
            brokerServiceUrlTls = Option(cd.getBrokerServiceUrlTls),
            proxyServiceUrl = Option(cd.getProxyServiceUrl),
            proxyProtocol = proxyProtocolToPb(cd.getProxyProtocol),
            peerClusterNames = Option(cd.getPeerClusterNames).map(_.asScala.toList).getOrElse(List.empty),
            authenticationPlugin = Option(cd.getAuthenticationPlugin),
            authenticationParameters = Option(cd.getAuthenticationParameters),
            isBrokerClientTlsEnabled = Option(cd.isBrokerClientTlsEnabled),
            isTlsAllowInsecureConnection = Option(cd.isTlsAllowInsecureConnection),
            isBrokerClientTlsEnabledWithKeyStore = Option(cd.isBrokerClientTlsEnabledWithKeyStore),
            brokerClientTlsTrustStoreType = Option(cd.getBrokerClientTlsTrustStoreType),
            brokerClientTlsTrustStore = Option(cd.getBrokerClientTlsTrustStore),
            brokerClientTrustCertsFilePath = Option(cd.getBrokerClientTrustCertsFilePath),
            listenerName = Option(cd.getListenerName)
        )

    def clusterDataFromPb(cd: pb.ClusterData): ClusterData =
        val b = org.apache.pulsar.common.policies.data.ClusterData.builder

        cd.serviceUrl.foreach(b.serviceUrl)
        cd.serviceUrlTls.foreach(b.serviceUrlTls)
        cd.brokerServiceUrl.foreach(b.brokerServiceUrl)
        cd.brokerServiceUrlTls.foreach(b.brokerServiceUrlTls)
        cd.proxyServiceUrl.foreach(b.proxyServiceUrl)
        conversions.proxyProtocolFromPb(cd.proxyProtocol).foreach(b.proxyProtocol)
        b.peerClusterNames(new java.util.LinkedHashSet(cd.peerClusterNames.toSet.asJava))
        cd.authenticationPlugin.foreach(b.authenticationPlugin)
        cd.authenticationParameters.foreach(b.authenticationParameters)
        cd.isBrokerClientTlsEnabled.foreach(b.brokerClientTlsEnabled)
        cd.isTlsAllowInsecureConnection.foreach(b.tlsAllowInsecureConnection)
        cd.isBrokerClientTlsEnabledWithKeyStore.foreach(b.brokerClientTlsEnabledWithKeyStore)
        cd.brokerClientTlsTrustStoreType.foreach(b.brokerClientTlsTrustStoreType)
        cd.brokerClientTlsTrustStore.foreach(b.brokerClientTlsTrustStore)
        cd.brokerClientTlsTrustStorePassword.foreach(b.brokerClientTlsTrustStorePassword)
        cd.brokerClientTrustCertsFilePath.foreach(b.brokerClientTrustCertsFilePath)
        cd.listenerName.foreach(b.listenerName)

        b.build

    def proxyProtocolToPb(proxyProtocol: ProxyProtocol): Option[pb.ProxyProtocol] =
        proxyProtocol match
            case ProxyProtocol.SNI => Some(pb.ProxyProtocol.PROXY_PROTOCOL_SNI)
            case _                 => None

    def proxyProtocolFromPb(proxyProtocol: Option[pb.ProxyProtocol]): Option[ProxyProtocol] =
        proxyProtocol match
            case Some(pb.ProxyProtocol.PROXY_PROTOCOL_SNI) => Some(ProxyProtocol.SNI)
            case _                                         => None

    def failureDomainToPb(failureDomain: FailureDomain): pb.FailureDomain =
        pb.FailureDomain(brokers = failureDomain.getBrokers.asScala.toSeq)

    def failureDomainFromPb(failureDomain: pb.FailureDomain): FailureDomain =
        FailureDomain.builder.brokers(brokers = failureDomain.brokers.toSet.asJava).build

    def autoFailoverPolicyDataFromPb(dataPb: pb.AutoFailoverPolicyData): AutoFailoverPolicyData =
        val builder = AutoFailoverPolicyData.builder

        autoFailoverPolicyTypeFromPb(dataPb.policyType).foreach(builder.policyType)
        builder.parameters(dataPb.parameters.asJava)

        builder.build

    def autoFailoverPolicyDataToPb(data: AutoFailoverPolicyData): pb.AutoFailoverPolicyData =
        pb.AutoFailoverPolicyData(
            policyType = autoFailoverPolicyTypeToPb(data.getPolicyType),
            parameters = data.getParameters.asScala.toMap
        )

    def autoFailoverPolicyTypeToPb(autoFailoverPolicyType: AutoFailoverPolicyType): pb.AutoFailoverPolicyType =
        autoFailoverPolicyType match
            case AutoFailoverPolicyType.min_available => pb.AutoFailoverPolicyType.AUTO_FAILOVER_POLICY_TYPE_MIN_AVAILABLE

    def autoFailoverPolicyTypeFromPb(autoFailoverPolicyTypePb: pb.AutoFailoverPolicyType): Option[AutoFailoverPolicyType] =
        autoFailoverPolicyTypePb match
            case pb.AutoFailoverPolicyType.AUTO_FAILOVER_POLICY_TYPE_MIN_AVAILABLE => Some(AutoFailoverPolicyType.min_available)
            case _                                                                 => None

    def namespaceIsolationDataFromPb(dataPb: pb.NamespaceIsolationData): NamespaceIsolationData =
        val builder = NamespaceIsolationData.builder

        builder.namespaces(dataPb.namespaces.asJava)
        builder.primary(dataPb.primary.asJava)
        builder.secondary(dataPb.secondary.asJava)
        dataPb.autoFailoverPolicy.foreach(d => builder.autoFailoverPolicy(autoFailoverPolicyDataFromPb(d)))

        builder.build

    def namespaceIsolationDataToPb(data: NamespaceIsolationData): pb.NamespaceIsolationData =
        pb.NamespaceIsolationData(
            namespaces = data.getNamespaces.asScala.toSeq,
            primary = data.getPrimary.asScala.toSeq,
            secondary = data.getSecondary.asScala.toSeq,
            autoFailoverPolicy = Option(data.getAutoFailoverPolicy).map(autoFailoverPolicyDataToPb)
        )

    def brokerNamespaceIsolationDataToPb(data: BrokerNamespaceIsolationData): pb.BrokerNamespaceIsolationData =
        pb.BrokerNamespaceIsolationData(
            brokerName = data.getBrokerName,
            policyName = data.getPolicyName,
            isPrimary = data.isPrimary,
            namespaceRegex = data.getNamespaceRegex.asScala.toSeq
        )
