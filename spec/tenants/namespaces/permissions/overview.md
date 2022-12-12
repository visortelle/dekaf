# Overview

In this section you will learn all about **permissions** and how to interact with them in our app.


## The permissions data structure. 

Permissions are used to securely differentiate access rights to a product. With this separation of rights, you can ensure that data only comes from sources with the right to produce, etc.The permission **role** is considered a **key**, and **must be unique**. Being the key, the **role can't be modified** after the permission is created. Permissions are set separately for each namespace.


### You can read how to set permissions with pulsar-admin in the  **[official documentation](https://pulsar.apache.org/docs/2.10.x/admin-api-permissions/)**


## Opening the permissions settings page

1. Navigate to the Tenant page.

  <img style="width: 450px" src="./assets/step-1.png" />

2. Next, you supposed to do - select the needed namespace, press on your **namespace**.

  <img style="width: 450px" src="./assets/step-2.png" />

3. Press on button **Permissions**, to open permission settings.

  <img style="width: 700px" src="./assets/step-3.png" />

On this page, using the comfortable interface, you can grant, revoke and update permissions.