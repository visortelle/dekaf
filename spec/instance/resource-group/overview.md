# Overview

In this section you will learn all about **resource groups** and how to interact with them in our app.

## The resource group (RG) data structure

One of these is created internally for every resource group configured. The RG **name** is considered a **key**, and **must be unique**. Being the key, the **name can't be modified** after the RG is created. Tenants and Namespaces directly reference RGs. The usage is **"vertical"**: i.e., a tenant or namespace references the same RG across all of the monitoring classes it uses (Publish/Dispatch/...), instead of referencing one RG for publish, another one for dispatch, etc.


### **[The official documentation](https://pulsar-apache-org.translate.goog/api/pulsar-broker/2.9.0-SNAPSHOT/index.html?org/apache/pulsar/broker/resourcegroup/ResourceGroupService.html&_x_tr_sl=en&_x_tr_tl=ru&_x_tr_hl=ru&_x_tr_pto=sc)**
