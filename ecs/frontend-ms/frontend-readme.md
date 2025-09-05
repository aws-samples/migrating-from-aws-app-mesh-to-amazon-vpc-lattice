# Create Frontend UI service

This guide provides instructions to launch Frontend UI service

## Prerequisites

- Existing Public ALB with HTTPS listener in us-west-2 region
- Two Target groups (`blue` and `green`) with 'ip' target type, protocol HTTP, and port 3000
- ALB Listener rule with `blue` target group receiving 100% of the requests and `green` target group receiving 0% of the requests
- Ensure ALB security group can send traffic to ECS tasks and receive HTTPs traffic from ECS tasks
- For the purposes of this workshop, we will use the same Security Group, Subnets, ECS Task role and Task Execution role for all the microservices

## Step 1: Register Task Definition

```bash
cd ../frontend-ms/
```

- Collect and store account details required for this section of the workshop.

```bash
chmod +x collect_account_details.sh
. ./collect_account_details.sh
```

- Run commands to modify placeholders for ACCOUNT_ID, ECS_TASK_ROLE, ECS_TASK_EXECUTION_ROLE.

```bash
perl -pe 's/ACCOUNT_ID/'$ACCOUNT_ID'/g' frontend-taskdef.json.template > frontend-taskdef.json
perl -pi -e 's/ECS_TASK_ROLE/'$ECS_TASK_ROLE'/g' frontend-taskdef.json
perl -pi -e 's/ECS_TASK_EXECUTION_ROLE/'$ECS_TASK_EXECUTION_ROLE'/g' frontend-taskdef.json
```

**Note:** Nginx server in Frontend UI application expects valid DNS values for order-ms, user-ms and product-ms services. For the purposes of this workshop, we only deployed product-ms service, so we will use product-ms App Mesh URL for 3 environment variables in the task definition. If you choose to fully deploy order-ms and user-ms, update USERS_DOMAIN environment variable value in `frontend-taskdef.json` with user-ms.inventory-mesh.local:4000 and ORDERS_DOMAIN environment variable value with order-ms.inventory-mesh.local:7000.

- Execute below command to register the task definition

```bash
export FRONTEND_TASKDEF_REVISION=`aws ecs register-task-definition \
  --cli-input-json file://frontend-taskdef.json \
  --region us-west-2 --query "taskDefinition.revision" --output text`
echo "export FRONTEND_TASKDEF_REVISION=$FRONTEND_TASKDEF_REVISION" >> $GIT_BASE_DIR/account_details.sh
```

## Step 2: Create Log Groups

Execute the create-log-groups.sh to create CloudWatch log groups for the frontend and associated x-ray containers.

```bash
chmod +x create-log-groups.sh
sh create-log-groups.sh
```

## Step 3: Create an IAM role to allow ECS service to update the ALB listener rule target group weights for blue green deployment.

- Create trust policy for ECS service

```bash
cat > alb-trust-policy.json << EOF
{
  "Version": "2012-10-17", 
  "Statement": [ 
    {
      "Sid": "AllowAccessToECSForInfrastructureManagement", 
      "Effect": "Allow", 
      "Principal": {
        "Service": "ecs.amazonaws.com" 
      }, 
      "Action": "sts:AssumeRole" 
    } 
  ] 
}
EOF
```

- Create the IAM role

```bash
aws iam create-role \
      --role-name ecsInfrastructureRoleForLoadBalancers \
      --assume-role-policy-document file://alb-trust-policy.json
```

- Attach the ECS Infra policy for Load Balancers

```bash
aws iam attach-role-policy \
      --role-name ecsInfrastructureRoleForLoadBalancers \
      --policy-arn arn:aws:iam::aws:policy/AmazonECSInfrastructureRolePolicyForLoadBalancers
```

## Step 4: Create ECS Service

- Run commands to modify placeholders CLUSTER_NAME, SUBNET1/2/3, task SECURITY_GROUP_ID, etc.

```bash
perl -pe 's/ACCOUNT_ID/'$ACCOUNT_ID'/g' frontend-service.json.template > frontend-service.json
perl -pi -e 's/CLUSTER_NAME/'$CLUSTER_NAME'/g' frontend-service.json
perl -pi -e 's/FRONTEND_TASKDEF_REVISION/'$FRONTEND_TASKDEF_REVISION'/g' frontend-service.json
perl -pi -e 's/SECURITY_GROUP_ID/'$SECURITY_GROUP_ID'/g' frontend-service.json
perl -pi -e 's/SUBNET1/'$SUBNET1'/g' frontend-service.json
perl -pi -e 's/SUBNET2/'$SUBNET2'/g' frontend-service.json
perl -pi -e 's/SUBNET3/'$SUBNET3'/g' frontend-service.json
perl -pi -e 's#BLUE_TARGET_GROUP_ARN#'$BLUE_TARGET_GROUP_ARN'#g' frontend-service.json
perl -pi -e 's#GREEN_TARGET_GROUP_ARN#'$GREEN_TARGET_GROUP_ARN'#g' frontend-service.json
perl -pi -e 's#LISTENER_RULE_ARN#'$LISTENER_RULE_ARN'#g' frontend-service.json
```

- Ensure the ECS Task Security Group can receive traffic at least from ALB security group on port 3000

- Create the ECS service

```bash
aws ecs create-service \
  --cli-input-json file://frontend-service.json \
  --region us-west-2
```

## Step 5: Verify the ECS Service

1. Check that the new task is running:

```bash
aws ecs list-tasks --cluster $CLUSTER_NAME --service-name frontend-ui --region us-west-2
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
