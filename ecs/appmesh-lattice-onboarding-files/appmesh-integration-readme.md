# Integrating Product Service with AWS App Mesh

This guide provides step-by-step instructions to deploy `product-ms` service to Amazon ECS with App Mesh integration. To test the migration, we are only deploying the product-ms service.

## Prerequisites

- Amazon ECS with EC2 instances and two essential IAM roles: a Task Role for application-specific permissions and a Task Execution Role for permissions to execute a task, e.g. securely retrieve database credentials from AWS Systems Manager Parameter Store, write task launch logs to CloudWatch. etc. For detailed instructions on setting up an ECS cluster, refer to the [AWS ECS Cluster Creation Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-ec2-cluster-console-v2.html)
- Ensure the Task Role has at least the AWS Managed Policy `CloudWatchFullAccessV2` attached
- Ensure the Task Execution Role has at least the AWS Managed Policies `AmazonECSTaskExecutionRolePolicy`, `AmazonSSMReadOnlyAccess`, and `CloudWatchLogsFullAccess` attached
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
export CLOUDMAP_NAMESPACE_ID=`aws servicediscovery list-namespaces --region us-west-2 --query "Namespaces[?Name=='inventory-mesh.local'].Id" --output text`
echo "export CLOUDMAP_NAMESPACE_ID=$CLOUDMAP_NAMESPACE_ID" >> $GIT_BASE_DIR/account_details.sh
```

2. Create `product-service-discovery.json` file from the template and create a Cloud Map service:

```bash
perl -pe 's/CLOUDMAP_NAMESPACE_ID/'$CLOUDMAP_NAMESPACE_ID'/g' product-service-discovery.json.template > product-service-discovery.json
export CLOUDMAP_SERVICE_ID=`aws servicediscovery create-service \
  --cli-input-json file://product-service-discovery.json \
  --region us-west-2 --query "Service.Id" --output text`
echo "export CLOUDMAP_SERVICE_ID=$CLOUDMAP_SERVICE_ID" >> $GIT_BASE_DIR/account_details.sh
```

## Step 3: Collect and store account details required for this section of the workshop.

```bash
chmod +x collect_account_details.sh
. ./collect_account_details.sh
```

## Step 4: Register Task Definition

- Run commands to modify placeholders AURORA_PG_PARAMETER, ACCOUNT_ID, ECS_TASK_ROLE and ECS_TASK_EXECUTION_ROLE.

```bash
perl -pe 's/ACCOUNT_ID/'$ACCOUNT_ID'/g' product-taskdef.json.template > product-taskdef.json
perl -pi -e 's/ECS_TASK_ROLE/'$ECS_TASK_ROLE'/g' product-taskdef.json
perl -pi -e 's/ECS_TASK_EXECUTION_ROLE/'$ECS_TASK_EXECUTION_ROLE'/g' product-taskdef.json
perl -pi -e 's/AURORA_PG_PARAMETER/'$AURORA_PG_PARAMETER'/g' product-taskdef.json
```

- Execute below command to register the task definition

```bash
export PRODUCT_TASKDEF_REVISION=`aws ecs register-task-definition \
  --cli-input-json file://product-taskdef.json \
  --region us-west-2 --query "taskDefinition.revision" --output text`
echo "export PRODUCT_TASKDEF_REVISION=$PRODUCT_TASKDEF_REVISION" >> $GIT_BASE_DIR/account_details.sh
```

## Step 5: Create ECS Service

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

2. Add the appmesh and xray permissions to the existing ECS task role.

```bash
aws iam put-role-policy \
  --role-name $ECS_TASK_ROLE \
  --policy-name AppMeshStreamPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "appmesh:StreamAggregatedResources",
        "Resource": "arn:aws:appmesh:us-west-2:'$ACCOUNT_ID':mesh/inventory-mesh/virtualNode/product-ms-vn"
      }
    ]
  }'

```
```
aws iam put-role-policy \
  --role-name $ECS_TASK_ROLE \
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

- Run commands to modify placeholders CLUSTER_NAME, SUBNET1/2/3, task SECURITY_GROUP_ID, etc.

```bash
perl -pe 's/ACCOUNT_ID/'$ACCOUNT_ID'/g' product-service.json.template > product-service.json
perl -pi -e 's/CLUSTER_NAME/'$CLUSTER_NAME'/g' product-service.json
perl -pi -e 's/PRODUCT_TASKDEF_REVISION/'$PRODUCT_TASKDEF_REVISION'/g' product-service.json
perl -pi -e 's/CLOUDMAP_SERVICE_ID/'$CLOUDMAP_SERVICE_ID'/g' product-service.json
perl -pi -e 's/SECURITY_GROUP_ID/'$SECURITY_GROUP_ID'/g' product-service.json
perl -pi -e 's/SUBNET1/'$SUBNET1'/g' product-service.json
perl -pi -e 's/SUBNET2/'$SUBNET2'/g' product-service.json
perl -pi -e 's/SUBNET3/'$SUBNET3'/g' product-service.json
```

- Create the ECS service

```bash
aws ecs create-service \
  --cli-input-json file://product-service.json \
  --region us-west-2
```
Initially configure the ECS task security group to allow inbound traffic on ports 4000 and 5000 from within the VPC's CIDR range. Once you implement the load balancer, you'll need to update these security group rules to only accept traffic from the load balancer's security group, enhancing your application's security posture by restricting direct access. 

## Step 6: Verify Integration

1. Check that the new task is running:

```bash
aws ecs list-tasks --cluster $CLUSTER_NAME --service-name product-service --region us-west-2
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
