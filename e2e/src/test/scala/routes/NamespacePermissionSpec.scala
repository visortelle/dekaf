package routes

import harness.DekafSuite
import harness.Eventually.eventually
import ui.ConfirmationDialog
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import org.apache.pulsar.common.policies.data.AuthAction
import scala.jdk.CollectionConverters.*
import java.util.EnumSet

class NamespacePermissionSpec extends DekafSuite:

  test("NS-6: granting a role permission shows the row after reload") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val fqn = s"$tenant/$ns"
    val role = fixtures.unique("role")

    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=access-control")

    page.getByTestId("permission-new-role-input").fill(role)
    page.getByTestId("permission-new-produce").click() // Pulsar rejects an empty action set.
    page.getByTestId("permission-grant-button").click()

    // Oracle: PulsarAdmin sees the grant - exactly `produce`, nothing more (over-granting is a bug).
    eventually() {
      val actions = admin.namespaces().getPermissions(fqn).asScala
        .get(role).map(_.asScala.toSet).getOrElse(Set.empty)
      assert(actions == Set(AuthAction.produce), s"actions were: $actions")
    }

    // Row appears after a fresh reload.
    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=access-control")
    assertThat(page.getByText(role).first())
      .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))
  }

  test("NS-7: updating a role's actions via the UI persists") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val fqn = s"$tenant/$ns"
    val role = fixtures.unique("role")

    admin.namespaces().grantPermissionOnNamespace(fqn, role, EnumSet.of(AuthAction.produce))

    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=access-control")
    assertThat(page.getByText(role).first())
      .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))

    // Add `consume` to the existing row and persist (update button is row-unique since the BUG-10 fix).
    page.getByTestId(s"permission-$role-consume").click()
    page.getByTestId(s"permission-update-button-$role").click()

    eventually() {
      val actions = admin.namespaces().getPermissions(fqn).asScala
        .get(role).map(_.asScala.toSet).getOrElse(Set.empty)
      assert(actions == Set(AuthAction.produce, AuthAction.consume), s"actions were: $actions")
    }
  }

  test("NS-7: revoking a role via the UI removes it") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val fqn = s"$tenant/$ns"
    val role = fixtures.unique("role")

    admin.namespaces().grantPermissionOnNamespace(fqn, role, EnumSet.of(AuthAction.produce))

    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=access-control")
    assertThat(page.getByText(role).first())
      .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))

    // Row-unique since the BUG-10 fix - addresses exactly this role's revoke control.
    page.getByTestId(s"permission-revoke-button-$role").click()
    ConfirmationDialog(page).confirm() // no guard / no force on the revoke dialog.

    eventually() {
      val perms = admin.namespaces().getPermissions(fqn).asScala
      assert(!perms.contains(role), s"permissions still: $perms")
    }
  }

  test("NS-16: granting multiple actions to a role in one row persists all of them") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val fqn = s"$tenant/$ns"
    val role = fixtures.unique("role")

    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=access-control")
    page.getByTestId("permission-new-role-input").fill(role)
    // Tick three of the six auth-action columns on the new-role row, then Grant.
    Seq("produce", "consume", "functions").foreach(a => page.getByTestId(s"permission-new-$a").click())
    page.getByTestId("permission-grant-button").click()

    eventually() {
      val actions = admin.namespaces().getPermissions(fqn).asScala
        .get(role).map(_.asScala.toSet).getOrElse(Set.empty)
      // Exact equality: a wiring bug that grants EXTRA actions must fail, not slip through a subset check.
      assert(actions == Set(AuthAction.produce, AuthAction.consume, AuthAction.functions),
        s"actions were: $actions")
    }
  }
