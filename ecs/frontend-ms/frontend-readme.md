# Create Frontend UI service

This guide provides instructions to launch Frontend UI service

## Prerequisites

- Existing Public ALB with HTTPS listener in us-west-2 region
- Two Target groups (`blue` and `green`) with 'ip' target type, protocol HTTP, and port 3000
- ALB Listener rule with `blue` target group receiving 100% of the requests and `green` target group receiving 0% of the requests
- Ensure ALB security group can send traffic to ECS tasks

## Step 1: Register Task Definition

```bash
cd ../frontend-ms/
```

- Update `frontend-taskdef.json` and replace the placeholders for ACCOUNT_ID, ECS_TASK_ROLE_ARN, ECS_TASK_EXECUTION_ROLE_ARN
- Ensure the ECS_TASK_ROLE has at least the AWS Managed Policy `CloudWatchFullAccessV2` attached
- Ensure the ECS_TASK_EXECUTION_ROLE has at least the AWS Managed Policies `AmazonECSTaskExecutionRolePolicy`, `AmazonSSMReadOnlyAccess`, and `CloudWatchLogsFullAccess` attached
- Execute below command to register the task definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://frontend-taskdef.json \
  --region us-west-2
```

**Note:** Nginx server in Frontend UI application expects valid DNS values for order-ms, user-ms and product-ms services. For the purposes of this workshop, we only deployed product-ms service, so we will use product-ms App Mesh URL for 3 environment variables in the task definition. If you choose to fully deploy order-ms and user-ms, update USERS_DOMAIN environment variable value with user-ms.inventory-mesh.local:4000 and ORDERS_DOMAIN environment variable value with order-ms.inventory-mesh.local:7000.

## Step 2: Create Log Groups

Execute the create-log-groups.sh to create CloudWatch log groups for the frontend and associated x-ray containers.

```bash
chmod +x create-log-groups.sh
sh create-log-groups.sh
```

## Step 3: Ensure task role has permissions to use X-Ray. Replace ECS_TASK_ROLE with your task role

```bash
aws iam put-role-policy \
  --role-name <ECS_TASK_ROLE> \
  --policy-name xrayPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries"
        ],
        "Resource": "*"
      }
    ]
  }'
```

## Step 4: Create ECS Service

- Update `frontend-service.json` and replace the placeholders for CLUSTER_NAME, TARGET_GROUP_ARN, SUBNET1/2/3 (keep as many private subnets needed), and SECURITY_GROUP
- Ensure the Security Group can receive traffic at least from ALB security group on port 3000
- Execute below command to create the service

```bash
aws ecs create-service \
  --cli-input-json file://frontend-service.json \
  --region us-west-2
```

## Step 5: Verify the ECS Service

1. Check that the new task is running:

```bash
aws ecs list-tasks --cluster CLUSTER_NAME --service-name frontend-ui --region us-west-2
```

2. Test the frontend-ui service using the appropriate DNS record for the PUBLIC ALB

```
curl https://REPLACE_WITH_DNS_RECORD_FOR_PUBLIC_ALB/
```

3. Test the product-ms service through the frontend-ui service

```
curl https://REPLACE_WITH_DNS_RECORD_FOR_PUBLIC_ALB/api/products
```

## VPC Lattice migration

After validating the application end-to-end with App Mesh, migrate the backend services to VPC Lattice following steps [here](../appmesh-lattice-onboarding-files/vpc-lattice-migration-readme.md).
