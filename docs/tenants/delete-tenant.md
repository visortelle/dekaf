# Delete Tenant

- You can delete tenant by clicking the "Delete" button.

- You'll see the following dialog

![delete pulsar tenant dialog](./img/delete-tenant-dialog.png)

- You can force the tenant deletion by checking the appropriate checkbox.

  :::tip

  The forceful tenant deletion feature may be disabled on the broker-level configuration.

  In order to enable it, you should set the `forceDeleteTenantAllowed` and `forceDeleteNamespaceAllowed` broker configuration properties to `true`. You can do in on the instance "Configuration" page.

  ![enable forceful tenant deletion](./img/enable-force-tenant-deletion.png)

  :::

- Fill the tenant deletion guard field

- Click the "Confirm" button
