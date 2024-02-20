package demo.tenants.cqrs.shared.converters

import com.tools.teal.pulsar.demoapp.account.v1 as pb
import demo.tenants.cqrs.model.Account.*
import demo.tenants.cqrs.shared.faker

object AccountConverter:
    def createAccountPbToAccountCreatedPbWrapped(createAccountPb: pb.CreateAccount): pb.AccountEventsSchema =
        val accountCreatedPbBuilder = pb.AccountCreated
            .newBuilder()
            .setAccountId(createAccountPb.getId)
            .setFirstName(createAccountPb.getFirstName)
            .setLastName(createAccountPb.getLastName)
            .setEmail(createAccountPb.getEmail)
            .setStatus(faker.lorem().word())

        pb.AccountEventsSchema
            .newBuilder()
            .setAccountCreated(accountCreatedPbBuilder)
            .build()
