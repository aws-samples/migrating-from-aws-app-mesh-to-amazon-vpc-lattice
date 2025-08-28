# Integrating Product Service with AWS App Mesh

This guide provides step-by-step instructions to deploy `product-ms` service to Amazon ECS with App Mesh integration. To test the migration, we are only deploying the product-ms service.

## Prerequisites

- Amazon ECS with EC2 instances and two essential IAM roles: a Task Role for application-specific permissions and a Task Execution Role. The Task Execution Role requires specific permissions to securely retrieve database credentials from AWS Systems Manager Parameter Store through the ssm:GetParameters action. For detailed instructions on setting up an ECS cluster, refer to the [AWS ECS Cluster Creation Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-ec2-cluster-console-v2.html)
- Verify that your ECS tasks can establish a connection to the Aurora Serverless PostgreSQL database. Review the database's security group settings and, if necessary, add an inbound rule that allows traffic on port 5432 (PostgreSQL's default port) from the ECS cluster's private subnet CIDR range.
- Ensure your environment has a pre-configured AWS App Mesh named "inventory-mesh" with external traffic enabled, and an AWS Cloud Map namespace configured as "inventory-mesh.local" for service discovery. 

## Create App Mesh Resources

1. Create the virtual node

Navigate back to the appmesh-lattice-onboarding-files directory if you are currently in one of the microservice directories (product-ms, order-ms, or user-ms). 

```bash
cd ../appmesh-lattice-onboarding-files/

aws appmesh create-virtual-node \
  --mesh-name inventory-mesh \
  --virtual-node-name product-ms-vn \
  --spec file://product-appmesh-virtual-node.json \
  --region us-west-2
```

2. Create the virtual service

```bash
aws appmesh create-virtual-service \
  --mesh-name inventory-mesh \
  --virtual-service-name product-ms.inventory-mesh.local \
  --spec file://product-appmesh-virtual-service.json \
  --region us-west-2
```

## Step 2: Create Service Discovery Service

1.  Get the namespace ID for your Cloud Map namespace

```bash
aws servicediscovery list-namespaces --region us-west-2 --query "Namespaces[?Name=='inventory-mesh.local'].Id" --output text
```

2. Update the `product-service-discovery.json` file with your namespace ID, then run:

```bash
aws servicediscovery create-service \
  --cli-input-json file://product-service-discovery.json \
  --region us-west-2
```

3. Note the service ID and ARN from the output.

## Step 3: Register Task Definition

- Update the `product-taskdef.json` file placeholders AURORA_PG_PARAMETER_ARN, ACCOUNT_ID, ECS_TASK_ROLE and ECS_TASK_EXECUTION_ROLE.
- Ensure the ECS_TASK_ROLE has at least the AWS Managed Policy `CloudWatchFullAccessV2` attached
- Ensure the ECS_TASK_EXECUTION_ROLE has at least the AWS Managed Policies `AmazonECSTaskExecutionRolePolicy`, `AmazonSSMReadOnlyAccess`, and `CloudWatchLogsFullAccess` attached
- Execute below command to register the task definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://product-taskdef.json \
  --region us-west-2
```

## Step 4: Create ECS Service

1. When using the awslogs log driver, the log groups need to be created before the containers can write logs to them. Based on the task definition, we need to create three log groups:

```
/ecs/product-ms

/ecs/product-ms-envoy

/ecs/product-ms-xray
```
Execute create-log-groups.sh to create the log groups:

```bash
chmod +x create-log-groups.sh
sh create-log-groups.sh
```

2. Add the appmesh and xray permissions to the existing ECS task role. Make sure to update the ACCOUNT_ID placeholder before creating the AppMeshStreamPolicy below.

```bash

aws iam put-role-policy \
  --role-name <ECS_TASK_ROLE> \
  --policy-name AppMeshStreamPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "appmesh:StreamAggregatedResources",
        "Resource": "arn:aws:appmesh:us-west-2:<ACCOUNT_ID>:mesh/inventory-mesh/virtualNode/product-ms-vn"
      }
    ]
  }'

```
```
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

3. Now update the `product-service.json` file placeholders CLUSTER_NAME, SUBNET1/2/3, task SECURITY_GROUP_ID, and SERVICE_DISCOVERY_ARN obtained from step 2, then create the ECS service:

```bash
aws ecs create-service \
  --cli-input-json file://product-service.json \
  --region us-west-2
```
Initially configure the ECS task security group to allow inbound traffic on ports 4000 and 5000 from within the VPC's CIDR range. Once you implement the load balancer, you'll need to update these security group rules to only accept traffic from the load balancer's security group, enhancing your application's security posture by restricting direct access. 

## Step 5: Verify Integration

1. Check that the new task is running:

```bash
aws ecs list-tasks --cluster your-ecs-cluster --service-name product-service --region us-west-2
```

2. Verify the service is registered with App Mesh:

```bash
aws appmesh describe-virtual-node --mesh-name inventory-mesh --virtual-node-name product-ms-vn --region us-west-2
```

3. From an EC2 instance in the same VPC as your ECS cluster and App Mesh resources, test connectivity to the service using the App Mesh endpoint:

```bash
curl -v http://product-ms.inventory-mesh.local:5000/api/products
```

## Deploy Frontend

Deploy the frontend application with steps in the [doc](../frontend-ms/frontend-readme.md).
