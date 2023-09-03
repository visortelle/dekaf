import * as pulumi from "@pulumi/pulumi";

const stack = pulumi.getStack();

export const mkIsPublicDemo = () => stack === "demo-pulsocat-com";
